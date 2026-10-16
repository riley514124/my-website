/* ============================================================
   p5/interactive-keyboard.js — 鍵盤生成藝術 Sketch
   ============================================================

   【學習重點】
   1. keyPressed()：偵測鍵盤按下事件
   2. key：取得按下的字元（'a', 'B', '1', ' '...）
   3. keyCode：取得按鍵的數字代碼（ENTER=13, SPACE=32...）
   4. push() / pop()：座標系狀態的儲存與恢復
   5. translate() / rotate()：2D 座標系變換
   6. beginShape() / vertex() / endShape()：自訂多邊形
   7. charCodeAt()：把字元轉換成 ASCII 數字（用於色相計算）
   ============================================================ */

const keyboardArt = {};

new p5(function (p) {

    /* 圖形種類（數字鍵 1~5 切換）*/
    let shapeMode = 1;

    /* 儲存已繪製的所有圖形資料（用於清除後重繪）*/
    let drawnShapes = [];

    /* ── setup ──────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(560, 420);
        canvas.parent('keyboard-canvas');
        p.background(15);

        /* 提示文字 */
        p.fill(80);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(13);
        p.text('點擊此區域後，按任意鍵開始創作', p.width / 2, p.height / 2);
        p.textAlign(p.LEFT, p.BASELINE);  /* 恢復預設對齊 */
    };

    /* draw 空著，所有繪製都在事件中發生 */
    p.draw = function () {};

    /* ── keyPressed：每次按鍵觸發一次 ──────────────── */
    p.keyPressed = function () {

        /* ── 特殊按鍵處理 ────────────────────────────── */

        /* 空白鍵：清空畫布 */
        if (p.keyCode === 32) {   /* 32 = 空白鍵的 keyCode */
            p.background(15);
            drawnShapes = [];
            return false;   /* return false 防止頁面捲動 */
        }

        /* 數字鍵 1~5：切換圖形種類 */
        if (p.key >= '1' && p.key <= '5') {
            shapeMode = parseInt(p.key);
            return;
        }

        /* ── 根據按鍵生成圖形 ────────────────────────── */

        /* 用 charCodeAt() 把字元轉為數字，計算色相
           例如 'a' → 97，'z' → 122
           乘以 37（質數）再取餘數，讓顏色分布更均勻 */
        let charCode = (p.key.charCodeAt(0) || 65);
        let hue      = (charCode * 37) % 360;

        /* HSB 模式產生鮮豔顏色 */
        p.colorMode(p.HSB, 360, 100, 100, 100);
        let col = p.color(hue, 80, 95, 80);
        p.colorMode(p.RGB, 255);

        /* 隨機位置 */
        let x    = p.random(40, p.width  - 40);
        let y    = p.random(40, p.height - 40);
        let size = p.random(15, 90);
        let rot  = p.random(p.TWO_PI);

        /* 儲存圖形資料 */
        drawnShapes.push({ x, y, size, col, rot, mode: shapeMode });

        /* 繪製圖形 */
        drawShape(x, y, size, col, rot, shapeMode);
    };


    /* ── drawShape()：繪製單一圖形 ────────────────────

       【push() / pop() 的作用】
       translate() 和 rotate() 會永久改變「座標系」。
       如果不用 push/pop，每次繪製都會累積偏移和旋轉，
       造成後續圖形位置錯亂。

       push()  → 儲存目前座標系狀態（快照）
       [做任何變換和繪製]
       pop()   → 恢復到 push() 前的狀態

       就像 Photoshop 的「建立新圖層 → 繪製 → 合層」的概念。
    ─────────────────────────────────────────────────────── */
    function drawShape(x, y, size, col, rot, mode) {

        p.push();                    /* ① 儲存目前座標系 */
        p.translate(x, y);           /* ② 把原點移到目標位置 */
        p.rotate(rot);               /* ③ 旋轉座標系 */

        p.fill(col);
        p.noStroke();

        switch (mode) {

            case 1: /* ── 圓形 ──────────────────────────── */
                p.ellipse(0, 0, size);
                /* 中心點的小圓（層次感）*/
                p.fill(255, 255, 255, 60);
                p.ellipse(0, 0, size * 0.3);
                break;

            case 2: /* ── 方形 ──────────────────────────── */
                p.rectMode(p.CENTER);
                p.rect(0, 0, size, size, size * 0.1); /* 圓角方形 */
                break;

            case 3: /* ── 等邊三角形 ──────────────────── */
                p.beginShape();
                p.vertex(0, -size / 2);              /* 頂點 */
                p.vertex(-size / 2, size / 2);       /* 左下 */
                p.vertex(size / 2, size / 2);        /* 右下 */
                p.endShape(p.CLOSE);                  /* CLOSE：自動封閉路徑 */
                break;

            case 4: /* ── 線條/十字 ──────────────────── */
                p.stroke(col);
                p.strokeWeight(2);
                p.noFill();
                p.line(-size / 2, 0, size / 2, 0);  /* 橫線 */
                p.line(0, -size / 2, 0, size / 2);  /* 直線 */
                break;

            case 5: /* ── 五角星 ──────────────────────── */
                drawStar(0, 0, size / 2, size * 0.2);
                break;
        }

        p.pop(); /* ④ 恢復座標系 */
    }

    /* ── 繪製五角星 ─────────────────────────────────────

       五角星由 10 個頂點交替構成：外頂點 + 內頂點
       用迴圈 + 三角函數（cos, sin）計算每個頂點座標

       角度公式：360° / 10 個頂點 = 每頂點 36°
       偶數頂點：外半徑（尖角）
       奇數頂點：內半徑（凹角）
    ─────────────────────────────────────────────────────── */
    function drawStar(cx, cy, outerR, innerR) {
        p.beginShape();
        for (let i = 0; i < 10; i++) {
            /* 讓星形從上方開始（減去 HALF_PI = -90°）*/
            let angle  = p.TWO_PI * i / 10 - p.HALF_PI;
            let radius = (i % 2 === 0) ? outerR : innerR;
            /* 三角函數：cos(角度) × 半徑 = X 座標 */
            p.vertex(
                cx + p.cos(angle) * radius,
                cy + p.sin(angle) * radius
            );
        }
        p.endShape(p.CLOSE);
    }


    /* ══════════════════════════════════════════════════
       對外暴露的控制函式
    ══════════════════════════════════════════════════ */
    keyboardArt.clearAll = function () {
        p.background(15);
        drawnShapes = [];
    };

    keyboardArt.saveImage = function () {
        p.saveCanvas('龍蝦俠_鍵盤藝術_' + Date.now(), 'png');
    };

    /* 從外部設定圖形種類（可接 select 下拉選單）*/
    keyboardArt.setMode = function (mode) {
        shapeMode = parseInt(mode);
    };

}, 'keyboard-canvas');
