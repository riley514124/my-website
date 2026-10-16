/* ============================================================
   p5/interactive-mouse.js — 滑鼠繪圖 Sketch
   ============================================================

   【學習重點】
   1. mouseIsPressed：持續偵測滑鼠是否按住
   2. mouseX / mouseY：目前滑鼠座標
   3. pmouseX / pmouseY：「上一幀」的滑鼠座標（計算速度用）
   4. p.dist()：計算兩點距離
   5. p.map()：數值區間映射
   6. calling-p5-js-from-javascript：
      暴露函式給 HTML 按鈕呼叫

   【整合模式】
   這是「calling-p5-js-from-javascript」的進階實作。
   HTML 按鈕直接呼叫 sketch 內部的函式：
     onclick="mouseDraw.clearCanvas()"
     onclick="mouseDraw.saveImage()"
     onclick="mouseDraw.randomColor()"
   ============================================================ */


/* ── 對外暴露的控制介面 ─────────────────────────────────────
   定義一個空物件，稍後把函式掛上去。
   因為這個物件掛在 window（全域），HTML 的 onclick 可以直接呼叫。
─────────────────────────────────────────────────────────── */
const mouseDraw = {};

new p5(function (p) {

    /* 目前繪製顏色（p5.Color 物件）*/
    let currentColor;

    /* 筆刷最大尺寸 */
    let maxBrushSize = 12;

    /* 是否已在畫布範圍內 */
    function isOnCanvas() {
        return (
            p.mouseX >= 0 && p.mouseX <= p.width &&
            p.mouseY >= 0 && p.mouseY <= p.height
        );
    }

    /* ── setup ──────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(560, 420);
        canvas.parent('mouse-canvas');   /* 放入指定 div */
        p.background(15);

        /* 初始顏色：龍蝦橘紅 */
        currentColor = p.color(255, 69, 0);

        /* 滑鼠游標改為十字準心（CSS 設定）*/
        canvas.elt.style.cursor = 'crosshair';
    };

    /* ── draw（每幀執行）────────────────────────────── */
    p.draw = function () {
        /* 只在滑鼠按住且在畫布內時繪製 */
        if (p.mouseIsPressed && isOnCanvas()) {

            /* ── 速度感知筆刷 ────────────────────────────
               計算本幀滑鼠移動速度
               p.dist(目前位置, 上一幀位置) = 移動距離

               移動越快 → 線條越細（像真實毛筆速寫）
               移動越慢 → 線條越粗（像慢慢描繪）
            ─────────────────────────────────────────────── */
            let speed = p.dist(p.mouseX, p.mouseY, p.pmouseX, p.pmouseY);

            /* map(輸入值, 輸入最小, 輸入最大, 輸出最小, 輸出最大) */
            let brushSize = p.map(speed, 0, 30, maxBrushSize, 1.5);
            brushSize = p.constrain(brushSize, 1.5, maxBrushSize);

            /* 在目前和上一幀位置之間插入多個點，讓線條平滑 */
            let steps = p.ceil(speed / 3);   /* 速度越快插越多點 */
            steps = p.constrain(steps, 1, 10);

            for (let i = 0; i <= steps; i++) {
                /* lerp：線性插值，在兩點之間均勻取樣 */
                let t = i / steps;
                let x = p.lerp(p.pmouseX, p.mouseX, t);
                let y = p.lerp(p.pmouseY, p.mouseY, t);

                p.noStroke();
                p.fill(currentColor);
                p.ellipse(x, y, brushSize);
            }
        }
    };

    /* ── mousePressed：點擊時切換顏色 ──────────────── */
    p.mousePressed = function () {
        if (!isOnCanvas()) return;

        /* 使用 HSB 色彩模式產生鮮豔的隨機顏色
           HSB = Hue（色相 0~360°）、Saturation（飽和度）、Brightness（亮度）
           比 RGB 更直覺：只要改 Hue，就能得到不同顏色的同等鮮豔度 */
        p.colorMode(p.HSB, 360, 100, 100, 100);
        currentColor = p.color(
            p.random(360),    /* 隨機色相（整個色輪）*/
            p.random(70, 90), /* 高飽和度（鮮豔）*/
            p.random(80, 100),/* 高亮度 */
            85                /* 略帶透明（疊色有層次感）*/
        );
        p.colorMode(p.RGB, 255); /* 切回 RGB 模式 */
    };

    /* ══════════════════════════════════════════════════
       對外暴露的控制函式（HTML 按鈕呼叫）
       ══════════════════════════════════════════════════ */

    /* 清空畫布 */
    mouseDraw.clearCanvas = function () {
        p.background(15);
    };

    /* 儲存畫布為圖片（p5 內建功能）
       saveCanvas(檔名, 格式) → 自動下載到電腦 */
    mouseDraw.saveImage = function () {
        p.saveCanvas('龍蝦俠_滑鼠繪圖_' + Date.now(), 'png');
    };

    /* 手動切換隨機顏色 */
    mouseDraw.randomColor = function () {
        p.colorMode(p.HSB, 360, 100, 100);
        currentColor = p.color(p.random(360), 85, 95);
        p.colorMode(p.RGB, 255);
    };

    /* 調整筆刷大小（slider 用）*/
    mouseDraw.setBrushSize = function (size) {
        maxBrushSize = parseFloat(size);
    };

}, 'mouse-canvas');
