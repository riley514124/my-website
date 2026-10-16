/* ============================================================
   p5/hero-sketch.js — 首頁 About 預覽區塊背景
   ============================================================

   【設計目標：清爽水彩暈染背景】
   取代原本密集的粒子+連線系統（容易與文字重疊，顯得「髒」），
   改用：
   - 8 個超大柔和色塊（半徑 100~200px）
   - 極低透明度（alpha 12~25 / 255 = 約 5~10%）
   - 非常緩慢漂移（speed 0.15~0.35 px/幀）
   - 邊緣柔化（多層同心圓，越外圈越透明）
   - 完全不繪製連線
   → 視覺效果：空氣感水彩暈染，不干擾文字閱讀

   【淡色主題配色】
   使用品牌色系的極淡版：
   - 橘紅（龍蝦品牌色 #c83200）→ HSB: 15°
   - 深藍（#1a2980）→ HSB: 225°
   - 翠綠（#0d6b5e）→ HSB: 172°
   - 紫（#7b1fa2）→ HSB: 288°
   全部飽和度壓低至 30~50%，明度拉高至 70~85%，保持柔和感

   【學習重點】
   1. HSB 色彩模式（比 RGB 更直覺地控制顏色鮮豔度）
   2. 多層同心圓模擬邊緣柔化（素描暈染技法數位化）
   3. Instance Mode + canvas.parent
   ============================================================ */

new p5(function (p) {

    /* ── 設定常數 ─────────────────────────────────────────── */
    const BLOB_COUNT = 8;        /* 色塊數量（少即是多）*/

    /* 品牌色系的 HSB 色相角度 */
    const HUES = [15, 225, 172, 288, 35, 200, 45, 260];

    let blobs = [];

    /* ══════════════════════════════════════════════════════════
       Blob 類別：大型柔和漂浮色塊
       ══════════════════════════════════════════════════════════ */
    class Blob {

        constructor(hue) {
            this.hue = hue;
            this.reset(true);
        }

        /* reset：初始化位置和屬性
           initialSpread=true 時隨機散佈在整個畫面，
           false 時從邊緣重生（取代消失的色塊） */
        reset(initialSpread) {
            this.r = p.random(100, 200);      /* 色塊半徑 */

            if (initialSpread) {
                this.x = p.random(p.width);
                this.y = p.random(p.height);
            } else {
                /* 從隨機邊緣進入 */
                let side = p.floor(p.random(4));
                if (side === 0) { this.x = p.random(p.width); this.y = -this.r; }
                else if (side === 1) { this.x = p.width + this.r; this.y = p.random(p.height); }
                else if (side === 2) { this.x = p.random(p.width); this.y = p.height + this.r; }
                else { this.x = -this.r; this.y = p.random(p.height); }
            }

            /* 非常緩慢的漂移速度（約 0.15~0.35 像素/幀）*/
            let angle = p.random(p.TWO_PI);
            let speed = p.random(0.15, 0.35);
            this.vx = p.cos(angle) * speed;
            this.vy = p.sin(angle) * speed;

            /* 呼吸動畫參數 */
            this.breathPhase = p.random(p.TWO_PI);
            this.breathSpeed = p.random(0.005, 0.012);

            /* 透明度：極低（約 5~10%）讓色塊像水彩底層渲染 */
            this.alpha = p.random(12, 25);

            /* HSB 飽和度與明度（柔和版）*/
            this.saturation = p.random(30, 50);
            this.brightness  = p.random(70, 85);
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.breathPhase += this.breathSpeed;

            /* 超出邊緣一段距離後從對面重生 */
            let margin = this.r + 20;
            if (this.x < -margin || this.x > p.width + margin ||
                this.y < -margin || this.y > p.height + margin) {
                this.reset(false);
            }
        }

        draw() {
            /* 呼吸效果：半徑緩慢脈動 ±8% */
            let displayR = this.r * (0.92 + 0.08 * p.sin(this.breathPhase));

            p.noStroke();

            /* ── 多層同心圓：模擬水彩邊緣柔化效果 ──────────
               從最外層（透明度接近 0）到最內層（alpha）繪製，
               製造「由外向內漸濃」的暈染感。

               LAYERS = 6 → 6 層，每層縮小 1/6 半徑，透明度依次增加
            ────────────────────────────────────────────── */
            const LAYERS = 6;
            p.colorMode(p.HSB, 360, 100, 100, 255);

            for (let i = LAYERS; i >= 1; i--) {
                let ratio = i / LAYERS;             /* 1.0（外）→ 0.167（內）*/
                let layerR = displayR * ratio;
                /* 外層透明，內層不透明 → 暈染感 */
                let layerAlpha = this.alpha * (1 - ratio * 0.7);
                let c = p.color(this.hue, this.saturation, this.brightness, layerAlpha);
                p.fill(c);
                p.ellipse(this.x, this.y, layerR * 2);
            }

            p.colorMode(p.RGB, 255);
        }
    }


    /* ══════════════════════════════════════════════════════════
       p5.js 生命週期
       ══════════════════════════════════════════════════════════ */

    p.setup = function () {
        let container = document.getElementById('about-canvas-container');
        let w = container ? container.offsetWidth  : p.windowWidth;
        let h = container ? container.offsetHeight : 500;
        if (h < 100) h = 500;

        let canvas = p.createCanvas(w, h);
        canvas.parent('about-canvas-container');

        /* 建立色塊，依序使用品牌色相 */
        for (let i = 0; i < BLOB_COUNT; i++) {
            blobs.push(new Blob(HUES[i % HUES.length]));
        }

        /* 初始畫面：填滿頁面底色（避免第一幀閃白）*/
        p.background(249, 247, 242);
    };

    p.draw = function () {

        /* ── 每幀用半透明底色覆蓋，保留淡淡殘影 ────────────
           不清空畫面（background）而是用半透明矩形蓋住，
           讓色塊移動時留下非常淡的殘影，增加水彩感。

           alpha 值 8/255 ≈ 3%：幾乎不可見，殘影超長 → 靜態感
           若想讓色塊移動感更明顯，可以調高（如 25~40）
        ─────────────────────────────────────────────── */
        p.fill(249, 247, 242, 8);
        p.noStroke();
        p.rect(0, 0, p.width, p.height);

        /* 更新並繪製所有色塊 */
        for (let blob of blobs) {
            blob.update();
            blob.draw();
        }
    };

    p.windowResized = function () {
        let container = document.getElementById('about-canvas-container');
        if (container) {
            let w = container.offsetWidth;
            let h = container.offsetHeight;
            if (h < 100) h = 500;
            p.resizeCanvas(w, h);
        }
    };

}, 'about-canvas-container');
