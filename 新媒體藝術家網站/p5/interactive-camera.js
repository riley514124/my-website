/* ============================================================
   p5/interactive-camera.js — 鏡頭像素化藝術 Sketch
   ============================================================

   【學習重點】
   1. createCapture(VIDEO)：存取裝置鏡頭
   2. loadPixels()：把畫面像素載入為陣列
   3. pixels[]：RGBA 像素陣列的讀取方式
   4. 像素化效果：以方塊重新詮釋每個像素
   5. 灰階 / 色彩反轉 等像素處理技法
   6. 使用者權限請求（getUserMedia）

   【像素陣列說明】
   p5.js 的 pixels[] 是一維陣列，每個像素佔 4 格：
   [R, G, B, A,  R, G, B, A,  R, G, B, A, ...]
    px(0,0)       px(1,0)       px(2,0)

   第 (x, y) 個像素的起始 index：
   idx = (x + y * 圖片寬度) * 4

   pixels[idx]   = R（紅 0~255）
   pixels[idx+1] = G（綠 0~255）
   pixels[idx+2] = B（藍 0~255）
   pixels[idx+3] = A（透明度 0~255）
   ============================================================ */

const cameraSketch = {};

new p5(function (p) {

    let capture = null;   /* p5 Video Capture 物件 */
    let isActive = false; /* 是否已開啟鏡頭 */
    let styleMode = 0;    /* 0=彩色像素 1=灰階 2=反轉 3=熱成像 */
    const STYLE_NAMES = ['彩色像素', '灰階', '色彩反轉', '熱成像'];

    /* ── setup ──────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(560, 420);
        canvas.parent('camera-canvas');
        p.background(15);

        /* 等待狀態的提示文字 */
        p.fill(70);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('點擊「開啟鏡頭」按鈕', p.width / 2, p.height / 2);
        p.textAlign(p.LEFT, p.BASELINE);
    };

    /* ── draw ───────────────────────────────────────── */
    p.draw = function () {
        if (!isActive || !capture) return;

        /* 確保影像像素已載入 */
        capture.loadPixels();
        if (capture.pixels.length === 0) return;

        /* ── 像素化程度 ──────────────────────────────
           滑鼠 X 位置決定方塊大小
           左側 → 細膩（方塊 4px）
           右側 → 粗糙（方塊 28px）
        ─────────────────────────────────────────────── */
        let blockSize = p.floor(
            p.map(p.mouseX, 0, p.width, 4, 28)
        );
        blockSize = p.constrain(blockSize, 4, 28);

        p.noStroke();

        /* 逐方塊掃描並重繪 */
        for (let y = 0; y < p.height; y += blockSize) {
            for (let x = 0; x < p.width; x += blockSize) {

                /* 把畫布座標映射回鏡頭影像座標 */
                let srcX = p.floor(p.map(x, 0, p.width,  0, capture.width  - 1));
                let srcY = p.floor(p.map(y, 0, p.height, 0, capture.height - 1));

                /* 水平翻轉（鏡頭影像左右相反，符合鏡面直覺）*/
                srcX = capture.width - 1 - srcX;

                /* 計算像素陣列的起始 index */
                let idx = (srcX + srcY * capture.width) * 4;

                /* 讀取 RGB 值 */
                let r = capture.pixels[idx];
                let g = capture.pixels[idx + 1];
                let b = capture.pixels[idx + 2];

                /* ── 套用視覺效果 ───────────────────────
                   不同模式對 RGB 值做不同的數學運算
                ─────────────────────────────────────────── */
                switch (styleMode) {

                    case 0: /* 彩色像素：直接使用原始 RGB */
                        p.fill(r, g, b);
                        break;

                    case 1: /* 灰階：把 RGB 平均為一個亮度值 */
                        let gray = (r * 0.299 + g * 0.587 + b * 0.114); /* 加權平均（人眼感知比例）*/
                        p.fill(gray);
                        break;

                    case 2: /* 色彩反轉：255 - 每個通道的值 */
                        p.fill(255 - r, 255 - g, 255 - b);
                        break;

                    case 3: /* 熱成像：依亮度映射到 冷→熱 色彩 */
                        let brightness = (r + g + b) / 3;
                        p.colorMode(p.HSB, 360, 100, 100);
                        /* 亮度低→藍（冷），亮度高→紅（熱）*/
                        let hue = p.map(brightness, 0, 255, 240, 0);
                        p.fill(hue, 90, 90);
                        p.colorMode(p.RGB, 255);
                        break;
                }

                /* 畫出方塊（以掃描位置為左上角）*/
                p.rect(x, y, blockSize, blockSize);
            }
        }

        /* 右上角顯示目前模式 */
        p.fill(255, 255, 255, 140);
        p.noStroke();
        p.textAlign(p.RIGHT, p.TOP);
        p.textSize(11);
        p.text(STYLE_NAMES[styleMode], p.width - 10, 10);
        p.textAlign(p.LEFT, p.BASELINE);

        /* 左下角顯示方塊大小 */
        p.fill(255, 255, 255, 80);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.textSize(10);
        p.text('像素大小：' + blockSize, 10, p.height - 10);
        p.textAlign(p.LEFT, p.BASELINE);
    };


    /* ══════════════════════════════════════════════════
       對外暴露的控制函式
    ══════════════════════════════════════════════════ */

    /* 請求鏡頭權限並開始 */
    cameraSketch.requestCamera = function () {
        /* createCapture(VIDEO)：
           - 建立一個隱藏的 <video> 元素
           - 瀏覽器會彈出「是否允許使用鏡頭？」對話框
           - 使用者允許後，影像開始串流
           - 第二個參數 callback：成功後執行 */
        capture = p.createCapture(p.VIDEO, function () {
            isActive = true;
            capture.hide();  /* 隱藏原始 video 元素（我們用 p5 重新繪製）*/

            /* 隱藏「權限請求」遮罩 */
            let overlay = document.getElementById('camera-permission');
            if (overlay) overlay.classList.add('hidden');
        });

        /* 設定鏡頭解析度（不需要太高，像素化效果時差異不大）*/
        capture.size(320, 240);
    };

    /* 切換視覺風格 */
    cameraSketch.toggleStyle = function () {
        styleMode = (styleMode + 1) % 4;
    };

    /* 關閉鏡頭 */
    cameraSketch.stopCamera = function () {
        if (capture) {
            /* 停止影像串流並移除 video 元素 */
            capture.remove();
            capture = null;
            isActive = false;
            p.background(15);

            p.fill(70);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text('鏡頭已關閉', p.width / 2, p.height / 2);
            p.textAlign(p.LEFT, p.BASELINE);

            /* 重新顯示「開啟鏡頭」遮罩 */
            let overlay = document.getElementById('camera-permission');
            if (overlay) overlay.classList.remove('hidden');
        }
    };

}, 'camera-canvas');
