/* ============================================================
   p5/interactive-3d.js — 3D WebGL 互動雕塑 Sketch
   ============================================================

   【學習重點】
   1. createCanvas(w, h, WEBGL)：啟用 3D 模式
   2. 3D 幾何圖形：box / sphere / torus / cone / cylinder
   3. 光源設定：ambientLight / directionalLight / pointLight
   4. 材質設定：specularMaterial / shininess
   5. 3D 旋轉：rotateX / rotateY / rotateZ
   6. 拖拉控制視角（滑鼠 drag 偵測）
   7. orbitControl()：p5 內建的 3D 視角控制

   【WEBGL 座標系說明】
   一般 2D 模式：原點在左上角，Y 軸向下
   WEBGL 3D 模式：原點在畫布中心，Y 軸向上（數學標準）
   ============================================================ */

const webgl3d = {};

new p5(function (p) {

    /* 目前顯示的圖形 */
    const SHAPES   = ['box', 'sphere', 'torus', 'cone', 'cylinder'];
    let shapeIndex = 0;

    /* 旋轉控制 */
    let autoRotate = true;
    let rotX = 0.2;  /* 初始稍微傾斜，讓 3D 感更明顯 */
    let rotY = 0;

    /* 線框模式 */
    let wireframe = false;

    /* 拖拉起點（null = 沒在拖拉）*/
    let dragStart = null;

    /* 動態光源相位（讓光源繞著物件轉，產生動態光影）*/
    let lightPhase = 0;

    /* ── setup ──────────────────────────────────────── */
    p.setup = function () {
        /* 【關鍵】第三個參數 p.WEBGL：啟用 3D 渲染引擎 */
        let canvas = p.createCanvas(560, 420, p.WEBGL);
        canvas.parent('webgl-canvas');
        canvas.elt.style.cursor = 'grab';
    };

    /* ── draw ───────────────────────────────────────── */
    p.draw = function () {

        /* WEBGL 模式的背景（使用 RGBA 數值）*/
        p.background(15, 15, 15);

        /* ── 光源設定 ──────────────────────────────────

           【三種光源】
           ambientLight：環境光，無方向，讓所有面都有基本亮度
           directionalLight：方向光（像太陽），有方向，產生陰影感
           pointLight：點光源（像燈泡），從一個點向四周發光

           光源顏色 = RGB（0~255）
           方向光的方向向量：(dx, dy, dz)
           點光源的位置：(x, y, z)
        ─────────────────────────────────────────────────── */
        p.ambientLight(40);  /* 基礎環境光（避免暗面全黑）*/

        /* 動態旋轉的橘色方向光
           sin/cos 讓光源圍繞 Y 軸旋轉（產生光影流動感）*/
        lightPhase += 0.015;
        p.directionalLight(
            255, 80, 30,                      /* 顏色：橘紅 */
            p.cos(lightPhase),                /* 方向 X */
            -0.7,                             /* 方向 Y（略朝下）*/
            p.sin(lightPhase)                 /* 方向 Z */
        );

        /* 固定的藍紫色補光 */
        p.pointLight(
            80, 80, 255,    /* 顏色：藍紫 */
            -200, -150, 100 /* 位置（左上前方）*/
        );

        /* ── 旋轉控制 ──────────────────────────────────

           滑鼠拖拉旋轉：
           記錄拖拉起點 → 計算位移 → 轉換為旋轉角度
        ─────────────────────────────────────────────────── */
        if (p.mouseIsPressed && dragStart) {
            let dx = (p.mouseX - dragStart.x) * 0.012;
            let dy = (p.mouseY - dragStart.y) * 0.012;
            rotY += dx;
            rotX += dy;
            dragStart = { x: p.mouseX, y: p.mouseY };
        }

        /* 自動旋轉 */
        if (autoRotate) {
            rotY += 0.009;
            rotX  = p.lerp(rotX, 0.3, 0.01);  /* 緩慢趨向穩定傾角 */
        }

        /* 套用旋轉 */
        p.rotateX(rotX);
        p.rotateY(rotY);

        /* ── 材質設定 ──────────────────────────────────

           【specularMaterial vs ambientMaterial】
           ambientMaterial：漫反射材質，光均勻散射（像石膏）
           specularMaterial：鏡面反射材質，有高光點（像金屬/塑料）
           shininess()：高光集中程度，數字越大高光越集中
        ─────────────────────────────────────────────────── */
        if (wireframe) {
            /* 線框模式：不填色，只畫邊線 */
            p.noFill();
            p.stroke(255, 69, 0, 200);
            p.strokeWeight(1.2);
        } else {
            p.noStroke();
            p.specularMaterial(240, 90, 40);   /* 橘紅金屬感 */
            p.shininess(120);                   /* 高度集中高光 */
        }

        /* ── 繪製 3D 圖形 ──────────────────────────────

           p5.js WEBGL 內建圖形：
           box(size)               → 正方體
           sphere(radius, detailX, detailY) → 球體（detail = 面數）
           torus(radius, tubeRadius)  → 甜甜圈形
           cone(radius, height)    → 錐體
           cylinder(radius, height)→ 圓柱
        ─────────────────────────────────────────────────── */
        const S = 115;  /* 基準尺寸 */

        switch (SHAPES[shapeIndex]) {
            case 'box':
                p.box(S, S, S);
                break;

            case 'sphere':
                /* detail 參數：24 = 24 面（越高越圓滑，但效能越差）*/
                p.sphere(S * 0.75, 24, 24);
                break;

            case 'torus':
                /* torus(外半徑, 管子半徑) */
                p.torus(S * 0.55, S * 0.22, 24, 16);
                break;

            case 'cone':
                p.cone(S * 0.6, S * 1.2, 24);
                break;

            case 'cylinder':
                p.cylinder(S * 0.5, S * 1.1, 24);
                break;
        }

        /* 標示目前形狀名稱（左上角）*/
        p.resetMatrix();   /* 恢復原始座標（取消旋轉）*/
        p.noLights();
        p.fill(80);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text(SHAPES[shapeIndex].toUpperCase(), -p.width / 2 + 16, -p.height / 2 + 14);
    };

    /* ── 滑鼠事件 ───────────────────────────────────── */
    p.mousePressed = function () {
        dragStart = { x: p.mouseX, y: p.mouseY };
        p.elt && (p.elt.style.cursor = 'grabbing');
    };

    p.mouseReleased = function () {
        dragStart = null;
        p.elt && (p.elt.style.cursor = 'grab');
    };

    /* ══════════════════════════════════════════════════
       對外暴露的控制函式
    ══════════════════════════════════════════════════ */

    /* 切換到下一個 3D 圖形 */
    webgl3d.nextShape = function () {
        shapeIndex = (shapeIndex + 1) % SHAPES.length;
    };

    /* 切換線框模式 */
    webgl3d.toggleWireframe = function () {
        wireframe = !wireframe;
    };

    /* 暫停/繼續自動旋轉 */
    webgl3d.toggleRotate = function () {
        autoRotate = !autoRotate;
    };

}, 'webgl-canvas');
