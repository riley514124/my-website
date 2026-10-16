/* ============================================================
   p5/interactive-sound.js — 聲音視覺化 Sketch（全新）
   ============================================================

   【學習重點】
   1. p5.sound 套件：p5.js 的聲音擴充
   2. p5.AudioIn：麥克風輸入
   3. p5.FFT：快速傅立葉轉換（頻率分析）
      → 把聲音訊號分解成不同頻率的強度
   4. FFT.analyze()：頻率頻譜陣列（低頻→高頻）
   5. FFT.waveform()：波形陣列（聲音振幅隨時間的變化）
   6. p5.Amplitude：即時音量偵測
   7. userStartAudio()：解除瀏覽器的音訊自動播放限制

   【什麼是 FFT？】
   FFT（Fast Fourier Transform，快速傅立葉轉換）
   是一個數學演算法，能把「時域訊號」（聲音波形）
   轉換成「頻域訊號」（各頻率的強度）。

   就像把一首歌的「混合聲音」分解成：
   低音（Bass）、中音（Mid）、高音（Treble）各有多大聲。

   這讓我們能把音樂視覺化成頻譜圖（EQ 那種）。

   【引用需求】
   除了 p5.min.js，還需要引入：
   <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/addons/p5.sound.min.js"></script>
   ============================================================ */

const soundViz = {};

new p5(function (p) {

    let mic         = null;  /* p5.AudioIn：麥克風物件 */
    let fft         = null;  /* p5.FFT：頻率分析器 */
    let amplitude   = null;  /* p5.Amplitude：音量偵測器 */
    let isActive    = false; /* 是否已開啟麥克風 */
    let vizMode     = 0;     /* 0=波形 1=頻譜 2=合併 3=圓形 */

    /* 視覺動態記憶（讓圖形更流暢）*/
    let smoothed = new Array(512).fill(0);

    /* ── setup ──────────────────────────────────────── */
    p.setup = function () {
        let canvas = p.createCanvas(560, 420);
        canvas.parent('sound-canvas');
        p.background(15);

        /* 等待狀態提示 */
        p.fill(70);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(14);
        p.text('點擊「開啟麥克風」按鈕', p.width / 2, p.height / 2);
        p.textAlign(p.LEFT, p.BASELINE);

        /* 建立 FFT 分析器
           第一個參數 smoothing（0~1）：平滑化程度
           0 = 完全不平滑（每幀完全更新）
           0.9 = 高度平滑（變化緩慢，像慢動作）
           第二個參數 bins：分析的頻段數（2 的次方）*/
        fft = new p5.FFT(0.85, 512);

        /* 建立音量分析器 */
        amplitude = new p5.Amplitude(0.9);
    };

    /* ── draw（每幀執行）────────────────────────────── */
    p.draw = function () {
        if (!isActive) return;

        /* 半透明背景（拖尾效果）*/
        p.background(15, 15, 15, 40);

        /* 取得 FFT 分析結果 */
        let spectrum  = fft.analyze();     /* 頻率頻譜：0~255 的陣列 */
        let waveform  = fft.waveform();    /* 波形：-1~1 的陣列 */
        let vol       = amplitude.getLevel(); /* 整體音量：0~1 */

        /* 根據 vizMode 選擇視覺化方式 */
        switch (vizMode) {
            case 0: drawWaveform(waveform, vol); break;
            case 1: drawSpectrum(spectrum, vol); break;
            case 2:
                drawSpectrum(spectrum, vol);
                drawWaveform(waveform, vol);
                break;
            case 3: drawRadial(spectrum, waveform, vol); break;
        }

        /* 顯示音量指示器 */
        drawVolumeBar(vol);

        /* 右上角顯示模式名稱 */
        const MODE_NAMES = ['波形', '頻譜', '疊合', '圓形'];
        p.fill(255, 255, 255, 100);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.RIGHT, p.TOP);
        p.text(MODE_NAMES[vizMode], p.width - 10, 10);
        p.textAlign(p.LEFT, p.BASELINE);
    };


    /* ── 波形視覺化 ──────────────────────────────────

       waveform 陣列：每個值代表某個時間點的聲音振幅（-1~1）
       → 映射到畫布 Y 軸，繪製成連續的折線
    ─────────────────────────────────────────────────── */
    function drawWaveform(waveform, vol) {
        p.noFill();

        /* 根據音量決定線條粗細 */
        let weight = p.map(vol, 0, 1, 1.5, 4);
        p.strokeWeight(weight);

        /* 波形線（橘紅漸層）*/
        p.beginShape();
        for (let i = 0; i < waveform.length; i++) {
            let x = p.map(i, 0, waveform.length, 0, p.width);
            let y = p.map(waveform[i], -1, 1, p.height * 0.85, p.height * 0.15);

            /* 用 HSB 對應 X 位置做出彩虹漸層 */
            p.colorMode(p.HSB, 360, 100, 100, 100);
            let hue = p.map(i, 0, waveform.length, 0, 60);  /* 橘→黃色區間 */
            p.stroke(hue, 85, 95, 90);
            p.colorMode(p.RGB, 255);

            p.vertex(x, y);
        }
        p.endShape();

        /* 中心線（靜音時的基準線）*/
        p.stroke(255, 255, 255, 20);
        p.strokeWeight(1);
        p.line(0, p.height / 2, p.width, p.height / 2);
    }


    /* ── 頻譜視覺化 ──────────────────────────────────

       spectrum 陣列：每個值代表某個頻段的強度（0~255）
       index 0 = 最低頻（Bass）
       index 最大 = 最高頻（Treble）
       → 繪製為垂直的頻譜柱狀圖
    ─────────────────────────────────────────────────── */
    function drawSpectrum(spectrum, vol) {
        /* 只取前 256 個頻段（後半通常是噪音）*/
        let numBars = 128;
        let barW    = p.width / numBars;

        for (let i = 0; i < numBars; i++) {
            /* 取 4 個頻段的平均（讓柱子更穩定）*/
            let amp = (spectrum[i * 2] + spectrum[i * 2 + 1]) / 2;

            /* 平滑化：新值和舊值混合，避免閃爍 */
            smoothed[i] = p.lerp(smoothed[i], amp, 0.3);

            let barH = p.map(smoothed[i], 0, 255, 0, p.height * 0.85);

            /* 顏色：低頻橘紅，高頻紫藍 */
            p.colorMode(p.HSB, 360, 100, 100, 100);
            let hue = p.map(i, 0, numBars, 20, 280);
            let sat = p.map(smoothed[i], 0, 255, 40, 90);
            p.fill(hue, sat, 90, 85);
            p.noStroke();
            p.colorMode(p.RGB, 255);

            /* 柱子：從畫布底部往上畫 */
            p.rect(i * barW, p.height - barH, barW - 1, barH, 2, 2, 0, 0);

            /* 頂端光點 */
            p.fill(255, 200, 100, 120);
            p.rect(i * barW, p.height - barH - 3, barW - 1, 2);
        }
    }


    /* ── 圓形視覺化（進階效果）─────────────────────────

       把頻譜以圓形排列，創造類似 "音樂玫瑰" 的效果
    ─────────────────────────────────────────────────── */
    function drawRadial(spectrum, waveform, vol) {
        let cx = p.width  / 2;  /* 圓心 X */
        let cy = p.height / 2;  /* 圓心 Y */

        /* 外圈：頻譜放射 */
        let numBars = 90;
        for (let i = 0; i < numBars; i++) {
            let angle = p.map(i, 0, numBars, 0, p.TWO_PI);
            let amp   = spectrum[p.floor(i * 2)];

            smoothed[i] = p.lerp(smoothed[i], amp, 0.25);

            let innerR = 80;
            let outerR = innerR + p.map(smoothed[i], 0, 255, 0, 100);

            /* 計算柱子的兩個端點 */
            let x1 = cx + p.cos(angle) * innerR;
            let y1 = cy + p.sin(angle) * innerR;
            let x2 = cx + p.cos(angle) * outerR;
            let y2 = cy + p.sin(angle) * outerR;

            p.colorMode(p.HSB, 360, 100, 100, 100);
            let hue = p.map(i, 0, numBars, 0, 360);
            p.stroke(hue, 80, 95, 75);
            p.strokeWeight(2);
            p.colorMode(p.RGB, 255);
            p.line(x1, y1, x2, y2);
        }

        /* 內圈：波形 */
        p.noFill();
        p.stroke(255, 69, 0, 120);
        p.strokeWeight(1.5);
        p.beginShape();
        for (let i = 0; i < waveform.length; i += 4) {
            let angle = p.map(i, 0, waveform.length, 0, p.TWO_PI);
            let r     = 80 + waveform[i] * 30;
            p.vertex(cx + p.cos(angle) * r, cy + p.sin(angle) * r);
        }
        p.endShape(p.CLOSE);

        /* 中心脈衝圓 */
        let pulse = p.map(vol, 0, 1, 20, 70);
        p.noStroke();
        p.fill(255, 69, 0, 60);
        p.ellipse(cx, cy, pulse * 2);
        p.fill(255, 200, 100, 100);
        p.ellipse(cx, cy, pulse * 0.4);
    }


    /* ── 音量指示器（右側細條）──────────────────────── */
    function drawVolumeBar(vol) {
        let h = p.map(vol, 0, 1, 0, p.height);
        p.noStroke();
        /* 底色 */
        p.fill(30);
        p.rect(p.width - 8, 0, 6, p.height);
        /* 音量柱 */
        p.colorMode(p.HSB, 360, 100, 100);
        let hue = p.map(vol, 0, 1, 120, 0); /* 綠→紅 */
        p.fill(hue, 80, 90);
        p.colorMode(p.RGB, 255);
        p.rect(p.width - 8, p.height - h, 6, h);
    }


    /* ══════════════════════════════════════════════════
       對外暴露的控制函式
    ══════════════════════════════════════════════════ */

    /* 開啟麥克風 */
    soundViz.requestMic = function () {
        /* userStartAudio()：解除瀏覽器的音訊限制
           現代瀏覽器規定：必須有使用者互動後才能啟動音訊
           這個函式確保在使用者點擊後才啟動 */
        p.userStartAudio().then(function () {

            mic = new p5.AudioIn();
            mic.start();

            /* 把麥克風輸入接到 FFT 和 Amplitude 分析器 */
            fft.setInput(mic);
            amplitude.setInput(mic);

            isActive = true;

            /* 隱藏「開啟麥克風」遮罩 */
            let overlay = document.getElementById('sound-permission');
            if (overlay) overlay.classList.add('hidden');

        }).catch(function (err) {
            console.warn('麥克風授權失敗：', err);
        });
    };

    /* 切換視覺化模式 */
    soundViz.toggleMode = function () {
        vizMode = (vizMode + 1) % 4;
    };

    /* 關閉麥克風 */
    soundViz.stopMic = function () {
        if (mic) {
            mic.stop();
            mic = null;
            isActive = false;
            smoothed.fill(0);
            p.background(15);

            p.fill(70);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text('麥克風已關閉', p.width / 2, p.height / 2);
            p.textAlign(p.LEFT, p.BASELINE);

            let overlay = document.getElementById('sound-permission');
            if (overlay) overlay.classList.remove('hidden');
        }
    };

}, 'sound-canvas');
