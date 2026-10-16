/* ============================================================
   p5/interactive-p5-to-js.js
   calling-javascript-from-p5-js 示範 Sketch
   ============================================================

   【核心概念：p5.js → JavaScript → DOM】

   這個模式示範「p5.js 呼叫外部 JavaScript 函式」的方向：
   p5 sketch 內部發生某些事件（粒子碰壁、滑鼠位置、顏色變化）
   → 呼叫 p5 sketch 外部的純 JavaScript 函式
   → 這些函式更新 HTML 頁面上的 DOM 元素（文字、顏色、計數器）

   這與 calling-p5-js-from-javascript（在 interactive-mouse.js 中）
   方向相反：
   ┌─────────────────────────────────────────────────────┐
   │ calling-p5-from-js：HTML按鈕 → 呼叫 p5 sketch 函式 │  ← interactive-mouse.js
   │ calling-js-from-p5：p5 sketch → 呼叫 JS → 更新 DOM │  ← 本檔案
   └─────────────────────────────────────────────────────┘

   【示範情境：「色彩感應儀」】
   - p5 畫布有多顆飄動的彩色粒子球
   - 滑鼠位置決定「取樣點」
   - p5 每幀偵測滑鼠下方的顏色，呼叫 JS 函式更新：
       → DOM 色塊顯示當前顏色
       → HEX 色碼文字
       → RGB 數值
   - 粒子碰壁時呼叫 JS 函式更新碰壁計數器
   - 粒子碰撞時呼叫 JS 函式更新碰撞事件欄

   【學習重點】
   1. p5 sketch 內直接呼叫 window 上的普通 JavaScript 函式
   2. 用 document.getElementById 在 p5 外部定義好 DOM 更新函式
   3. 這就是 p5.js_with_html/3 課堂練習的完整版！
   ============================================================ */


/* ── 在 p5 sketch 外部定義「要被 p5 呼叫」的 JS 函式 ─────────

   重要：這些函式定義在 new p5(...) 的外部，
   但 p5 sketch 的 draw() 函式可以直接呼叫它們，
   因為它們都在同一個 JavaScript 全域作用域（window）裡。

   這就是 calling-javascript-from-p5-js 的精髓。
─────────────────────────────────────────────────────────── */

/**
 * 更新「顏色偵測器」DOM 元素
 * 由 p5 每幀呼叫，傳入 r/g/b 數值
 */
function updateColorDisplay(r, g, b) {

    /* 把 r/g/b 轉成 HEX 色碼
       例如：(255, 69, 0) → '#ff4500'
       toString(16)：把數字轉成 16 進位字串
       padStart(2, '0')：確保是兩位數（如 0 → '00'）*/
    const hex = '#'
        + Math.round(r).toString(16).padStart(2, '0')
        + Math.round(g).toString(16).padStart(2, '0')
        + Math.round(b).toString(16).padStart(2, '0');

    /* 更新 DOM 色塊 */
    const swatch = document.getElementById('p2j-color-swatch');
    if (swatch) swatch.style.backgroundColor = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

    /* 更新 HEX 文字 */
    const hexEl = document.getElementById('p2j-hex');
    if (hexEl) hexEl.textContent = hex.toUpperCase();

    /* 更新 RGB 數值 */
    const rgbEl = document.getElementById('p2j-rgb');
    if (rgbEl) rgbEl.textContent = `R:${Math.round(r)}  G:${Math.round(g)}  B:${Math.round(b)}`;
}

/**
 * 更新「碰壁計數器」
 * 每次有粒子碰到畫布邊界時呼叫
 */
let wallHitTotal = 0;
function onBallHitWall(ballName) {
    wallHitTotal++;
    const counter = document.getElementById('p2j-wall-count');
    if (counter) {
        counter.textContent = wallHitTotal;
        /* 跳動動畫：先移除再加回，讓 CSS animation 重播 */
        counter.classList.remove('p2j-bounce');
        void counter.offsetWidth;   /* 強制 reflow */
        counter.classList.add('p2j-bounce');
    }
}

/**
 * 更新「碰撞！」文字 + 碰撞累計次數
 * 兩個粒子發生碰撞時由 p5 呼叫，文字跳動讓學生清楚看到事件觸發
 */
let collisionTotal = 0;
function onCollision(colorA, colorB) {
    collisionTotal++;

    /* 更新碰撞累計次數 */
    const cnt = document.getElementById('p2j-collision-count');
    if (cnt) {
        cnt.textContent = collisionTotal;
        /* 跳動動畫：先移除再加回，讓 CSS animation 重播 */
        cnt.classList.remove('p2j-bounce');
        void cnt.offsetWidth;
        cnt.classList.add('p2j-bounce');
    }

    /* 碰撞！文字跳動提示 */
    const flash = document.getElementById('p2j-collision-flash');
    if (flash) {
        flash.classList.remove('p2j-bounce');
        void flash.offsetWidth;
        flash.classList.add('p2j-bounce');
    }

    /* 右側顏色條紋顯示最近碰撞的兩顆球顏色 */
    const barA = document.getElementById('p2j-col-a');
    const barB = document.getElementById('p2j-col-b');
    if (barA) barA.style.background = colorA;
    if (barB) barB.style.background = colorB;
}


/* ══════════════════════════════════════════════════════════
   p5.js Sketch：色彩感應儀
   ══════════════════════════════════════════════════════════ */

new p5(function (p) {

    /* ── Ball 類別 ──────────────────────────────────────── */
    class Ball {
        constructor() {
            this.reset();
        }

        reset() {
            this.x    = p.random(30, p.width  - 30);
            this.y    = p.random(30, p.height - 30);
            this.r    = p.random(16, 36);
            this.vx   = p.random(-2.5, 2.5);
            this.vy   = p.random(-2.5, 2.5);

            /* 使用 HSB 產生鮮豔顏色 */
            p.colorMode(p.HSB, 360, 100, 100);
            this.col = p.color(p.random(360), 80, 90);
            p.colorMode(p.RGB, 255);

            /* 取得顏色的 HEX 字串（供碰撞事件使用）*/
            this.hexColor = p.hex(p.red(this.col), 2)
                + p.hex(p.green(this.col), 2)
                + p.hex(p.blue(this.col), 2);
            this.hexColor = '#' + this.hexColor.toLowerCase();
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            /* 碰壁檢測：反彈 + 呼叫 JS 函式！*/
            if (this.x - this.r < 0) {
                this.x = this.r;
                this.vx *= -1;
                onBallHitWall(this.hexColor);  /* ← 呼叫外部 JS 函式！*/
            }
            if (this.x + this.r > p.width) {
                this.x = p.width - this.r;
                this.vx *= -1;
                onBallHitWall(this.hexColor);
            }
            if (this.y - this.r < 0) {
                this.y = this.r;
                this.vy *= -1;
                onBallHitWall(this.hexColor);
            }
            if (this.y + this.r > p.height) {
                this.y = p.height - this.r;
                this.vy *= -1;
                onBallHitWall(this.hexColor);
            }
        }

        draw() {
            p.noStroke();
            p.fill(this.col);
            p.ellipse(this.x, this.y, this.r * 2);
        }

        /* 與另一顆球的碰撞偵測 */
        collidesWith(other) {
            let d = p.dist(this.x, this.y, other.x, other.y);
            return d < this.r + other.r;
        }
    }

    /* ── 變數 ─────────────────────────────────────────── */
    let balls = [];
    const BALL_COUNT = 12;
    let collisionCooldown = 0;  /* 防止同一對球重複觸發 */

    /* ── setup ───────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(520, 460);
        canvas.parent('p2j-canvas');

        /* 建立粒子球 */
        for (let i = 0; i < BALL_COUNT; i++) {
            balls.push(new Ball());
        }

        /* 淡色奶白底色，配合頁面主題 */
        p.background(249, 247, 242);
    };

    /* ── draw ────────────────────────────────────────── */
    p.draw = function () {

        /* 拖尾效果（淡色背景版）*/
        p.fill(249, 247, 242, 40);
        p.noStroke();
        p.rect(0, 0, p.width, p.height);

        /* 更新並繪製所有球 */
        for (let ball of balls) {
            ball.update();
            ball.draw();
        }

        /* ── 滑鼠顏色偵測 → 呼叫 JS 函式更新 DOM ──────

           get(x, y)：取得畫布上某個座標的像素顏色（p5.Color）
           這就是 p5 呼叫 JS 函式的核心！

           每幀取得滑鼠位置的顏色，
           然後呼叫我們在外部定義的 updateColorDisplay() 函式
        ─────────────────────────────────────────────── */
        if (p.mouseX > 0 && p.mouseX < p.width &&
            p.mouseY > 0 && p.mouseY < p.height) {

            let c = p.get(p.mouseX, p.mouseY);   /* 取得滑鼠下方的像素顏色 */

            /* ← 呼叫外部 JavaScript 函式！*/
            updateColorDisplay(p.red(c), p.green(c), p.blue(c));

            /* 繪製滑鼠游標指示圈 */
            p.noFill();
            p.stroke(50, 50, 50, 160);
            p.strokeWeight(1.5);
            p.ellipse(p.mouseX, p.mouseY, 30, 30);
            p.line(p.mouseX - 18, p.mouseY, p.mouseX + 18, p.mouseY);
            p.line(p.mouseX, p.mouseY - 18, p.mouseX, p.mouseY + 18);
        }

        /* ── 球與球碰撞偵測 → 呼叫 JS 函式 ────────────
           O(n²) 迴圈：每對球都檢查一次
        ─────────────────────────────────────────────── */
        collisionCooldown = Math.max(0, collisionCooldown - 1);
        if (collisionCooldown === 0) {
            for (let i = 0; i < balls.length; i++) {
                for (let j = i + 1; j < balls.length; j++) {
                    if (balls[i].collidesWith(balls[j])) {

                        /* ← 呼叫外部 JavaScript 函式！*/
                        onCollision(balls[i].hexColor, balls[j].hexColor);
                        collisionCooldown = 20; /* 20 幀冷卻 */
                        break;
                    }
                }
                if (collisionCooldown > 0) break;
            }
        }
    };

}, 'p2j-canvas');
