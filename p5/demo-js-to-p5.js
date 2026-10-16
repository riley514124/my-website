/* ============================================================
   p5/demo-js-to-p5.js
   calling-p5-js-from-javascript 示範 Sketch
   ============================================================

   【核心概念：HTML/JavaScript → p5.js】

   這個模式與 calling-javascript-from-p5-js 方向相反：

   ┌────────────────────────────────────────────────────────┐
   │ calling-p5-from-js：HTML 按鈕 → 呼叫 p5 sketch 內的函式 │
   └────────────────────────────────────────────────────────┘

   實作方式：
   1. p5 sketch 內建立一個「對外接口物件」（例如 shapeCtrl）
   2. 在 sketch 函式裡把需要暴露的函式掛到這個物件上
   3. HTML 的 onclick 直接呼叫 shapeCtrl.xxx()

   這就是 p5.js_with_html/4 課堂練習的延伸完整版！

   【示範情境：「幾何形狀產生器」】
   - p5 畫布持續生成隨機幾何形狀
   - HTML 區域有四個控制按鈕：
       ① 改變形狀（circle / square / triangle / star）
       ② 改變顏色（呼叫 shapeCtrl.setColor）
       ③ 改變大小（呼叫 shapeCtrl.setSize）
       ④ 清空畫布（呼叫 shapeCtrl.clear）
   - 每點一次按鈕，p5 sketch 的行為立即改變

   【教學重點】
   1. sketch 對外暴露物件的設計模式
   2. HTML 按鈕的 onclick 直接呼叫 p5 函式
   3. 外部 JS 也可以用 setInterval 定期呼叫（自動化）
   ============================================================ */


/* ── 對外接口物件（HTML 按鈕透過這個物件呼叫 p5 函式）────────
   在 new p5() 之前宣告，讓 HTML 的 onclick 找得到它
─────────────────────────────────────────────────────────── */
const shapeCtrl = {};

new p5(function (p) {

    /* ── 控制變數（由外部 HTML 按鈕修改）────────────────── */
    let currentShape = 'circle';    /* 目前的形狀種類 */
    let currentColor = '#c83200';   /* 目前的填充顏色 */
    let currentSize  = 60;          /* 目前的形狀大小 */
    let autoMode     = false;       /* 自動產生模式 */

    /* 已繪製的形狀清單（讓畫面持續保留之前的形狀）*/
    let shapes = [];

    /* 按鈕點擊回饋動畫（顯示「已執行」提示）*/
    let feedbackMsg = '';
    let feedbackTimer = 0;

    /* ── setup ───────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(480, 400);
        canvas.parent('jtop5-canvas');
        p.background(249, 247, 242);
        p.textFont('sans-serif');
    };

    /* ── draw ────────────────────────────────────────── */
    p.draw = function () {
        p.background(249, 247, 242);

        /* 繪製所有已儲存的形狀 */
        for (let s of shapes) {
            drawShape(s.x, s.y, s.shape, s.col, s.size, s.rotation);
        }

        /* 自動產生模式：每 30 幀自動生成一個 */
        if (autoMode && p.frameCount % 30 === 0) {
            addShape(p.random(p.width), p.random(p.height));
        }

        /* 畫布中央的引導提示 */
        if (shapes.length === 0) {
            p.fill(160);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(13);
            p.text('點擊畫布 或 按下按鈕\n產生形狀', p.width / 2, p.height / 2);
            p.textAlign(p.LEFT, p.BASELINE);
        }

        /* 回饋提示文字 */
        if (feedbackTimer > 0) {
            feedbackTimer--;
            let alpha = p.map(feedbackTimer, 0, 40, 0, 220);
            p.fill(200, 50, 0, alpha);
            p.noStroke();
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(12);
            p.text(feedbackMsg, p.width / 2, p.height - 12);
            p.textAlign(p.LEFT, p.BASELINE);
        }
    };

    /* 點擊畫布時在點擊位置產生形狀 */
    p.mousePressed = function () {
        if (p.mouseX > 0 && p.mouseX < p.width &&
            p.mouseY > 0 && p.mouseY < p.height) {
            addShape(p.mouseX, p.mouseY);
        }
    };

    /* 在指定位置新增形狀 */
    function addShape(x, y) {
        shapes.push({
            x: x,
            y: y,
            shape:    currentShape,
            col:      currentColor,
            size:     currentSize,
            rotation: p.random(p.TWO_PI)
        });
        /* 最多保留 30 個形狀 */
        if (shapes.length > 30) shapes.shift();
    }

    /* 繪製單一形狀 */
    function drawShape(x, y, shape, col, size, rot) {
        p.push();
        p.translate(x, y);
        p.rotate(rot);
        p.fill(col);
        p.noStroke();

        switch (shape) {
            case 'circle':
                p.ellipse(0, 0, size);
                break;

            case 'square':
                p.rectMode(p.CENTER);
                p.rect(0, 0, size * 0.85, size * 0.85, size * 0.1);
                break;

            case 'triangle':
                p.triangle(
                    0, -size / 2,
                    -size / 2, size / 2,
                    size / 2, size / 2
                );
                break;

            case 'star':
                drawStar(size / 2, size * 0.2);
                break;

            case 'diamond':
                p.quad(0, -size / 2, size / 2, 0, 0, size / 2, -size / 2, 0);
                break;
        }
        p.pop();
    }

    /* 五角星繪製 */
    function drawStar(outerR, innerR) {
        p.beginShape();
        for (let i = 0; i < 10; i++) {
            let angle  = p.TWO_PI * i / 10 - p.HALF_PI;
            let radius = (i % 2 === 0) ? outerR : innerR;
            p.vertex(p.cos(angle) * radius, p.sin(angle) * radius);
        }
        p.endShape(p.CLOSE);
    }

    /* 顯示回饋提示 */
    function showFeedback(msg) {
        feedbackMsg   = msg;
        feedbackTimer = 50;
    }


    /* ══════════════════════════════════════════════════
       ↓↓↓ 對外暴露的函式（HTML 按鈕呼叫）↓↓↓
       以下函式掛在 shapeCtrl 物件上，
       HTML onclick="shapeCtrl.xxx()" 可直接呼叫
    ══════════════════════════════════════════════════ */

    /**
     * 切換到下一個形狀種類
     * HTML: onclick="shapeCtrl.nextShape()"
     */
    const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'];
    const SHAPE_NAMES = { circle:'圓形', square:'方形', triangle:'三角形', star:'星形', diamond:'菱形' };
    let shapeIdx = 0;

    shapeCtrl.nextShape = function () {
        shapeIdx = (shapeIdx + 1) % SHAPES.length;
        currentShape = SHAPES[shapeIdx];
        showFeedback('形狀 → ' + SHAPE_NAMES[currentShape]);

        /* 同步更新 HTML 顯示 */
        const el = document.getElementById('jtop5-current-shape');
        if (el) el.textContent = SHAPE_NAMES[currentShape];
    };

    /**
     * 設定顏色（接受任何 CSS 顏色字串）
     * HTML: onclick="shapeCtrl.setColor('#1a2980')"
     */
    shapeCtrl.setColor = function (hex) {
        currentColor = hex;
        showFeedback('顏色 → ' + hex);

        /* 同步更新 HTML 顏色預覽圓 */
        const el = document.getElementById('jtop5-color-dot');
        if (el) el.style.background = hex;
    };

    /**
     * 設定大小（20~120 之間）
     * HTML: onclick="shapeCtrl.setSize(80)"
     */
    shapeCtrl.setSize = function (s) {
        currentSize = p.constrain(s, 20, 120);
        showFeedback('大小 → ' + currentSize + 'px');

        const el = document.getElementById('jtop5-current-size');
        if (el) el.textContent = currentSize + ' px';
    };

    /**
     * 清空畫布
     * HTML: onclick="shapeCtrl.clear()"
     */
    shapeCtrl.clear = function () {
        shapes = [];
        showFeedback('畫布已清空');
    };

    /**
     * 在隨機位置產生一個形狀
     * HTML: onclick="shapeCtrl.addRandom()"
     */
    shapeCtrl.addRandom = function () {
        addShape(p.random(p.width), p.random(p.height));
        showFeedback('新增 ' + SHAPE_NAMES[currentShape]);
    };

    /**
     * 切換自動產生模式
     * HTML: onclick="shapeCtrl.toggleAuto()"
     */
    shapeCtrl.toggleAuto = function () {
        autoMode = !autoMode;
        showFeedback(autoMode ? '自動模式：開' : '自動模式：關');

        const el = document.getElementById('jtop5-auto-label');
        if (el) el.textContent = autoMode ? '停止自動' : '自動產生';
    };

    /**
     * 儲存畫布為圖片
     * HTML: onclick="shapeCtrl.saveCanvas()"
     */
    shapeCtrl.saveImage = function () {
        p.saveCanvas('龍蝦俠_幾何藝術_' + Date.now(), 'png');
        showFeedback('圖片已儲存');
    };

}, 'jtop5-canvas');
