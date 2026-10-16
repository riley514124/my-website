/* ============================================================
   main.js — 全站共用 JavaScript
   ============================================================

   【這個檔案的職責】
   1. 頁面載入動畫（Loading Screen）
   2. 導覽列：捲動時加深背景
   3. 導覽列：手機版漢堡選單開關
   4. 導覽列：自動標記目前所在頁面的連結
   5. 捲動進場動畫（Scroll Reveal）
   6. 平滑捲動（Smooth Scroll）

   【JavaScript 的基本概念：DOM 操作】

   DOM（Document Object Model）是瀏覽器把 HTML 轉換成的
   「樹狀結構」，JavaScript 可以透過它來：
   - 選取元素：document.querySelector('.nav-logo')
   - 修改樣式：element.style.color = 'red'
   - 新增/移除 class：element.classList.add('visible')
   - 監聽事件：element.addEventListener('click', function)
   ============================================================ */


/* ── 等待 HTML 完全載入後再執行 ────────────────────────────

   【為什麼要等？】
   瀏覽器是從上到下讀取 HTML 的，如果 JavaScript 放在
   <head> 或 <body> 中間，可能 HTML 元素還沒建立，
   JavaScript 就嘗試操作它，就會報錯。

   DOMContentLoaded 事件：
   當 HTML 完全解析完畢（但圖片等資源還在載入時）觸發，
   確保我們要操作的 DOM 元素都已存在。
   ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

    /* ── 初始化所有功能 ─────────────────────────────────── */
    initLoader();         // 1. 頁面載入動畫
    initNavScroll();      // 2. 捲動加深導覽列
    initNavToggle();      // 3. 漢堡選單
    initActiveNavLink();  // 4. 標記目前頁面的連結
    initScrollReveal();   // 5. 捲動進場動畫
    initSmoothScroll();   // 6. 平滑捲動

});


/* ══════════════════════════════════════════════════════════
   1. 頁面載入動畫
   ══════════════════════════════════════════════════════════

   當頁面完全載入後，隱藏 loading 遮罩
   ══════════════════════════════════════════════════════════ */
function initLoader() {
    // 選取 loading 元素
    const loader = document.querySelector('.page-loader');

    // 如果頁面沒有 loader，直接跳過
    if (!loader) return;

    // window.load 事件：等待所有資源（圖片、字體等）都載入完畢
    window.addEventListener('load', function () {

        // 300ms 後才隱藏，讓使用者能短暫看到 loading 動畫
        setTimeout(function () {
            loader.classList.add('hidden');

            // 動畫結束後從 DOM 移除，釋放記憶體
            loader.addEventListener('transitionend', function () {
                loader.remove();
            }, { once: true }); // once: true → 只執行一次後自動移除監聽器
        }, 300);
    });
}


/* ══════════════════════════════════════════════════════════
   2. 捲動時加深導覽列背景
   ══════════════════════════════════════════════════════════

   【原理】
   監聽 window 的 scroll 事件：
   - 當頁面往下捲超過 50px → 加上 .scrolled class
   - 當頁面回到頂端 → 移除 .scrolled class
   ══════════════════════════════════════════════════════════ */
function initNavScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    /* ── Hero 模式偵測（首頁專用）──────────────────────────────
       首頁有 #hero 影片背景 section（100vh 高）。
       當使用者還在 hero 範圍內，nav 切換為白字/透明底（hero-mode）。
       捲出 hero 後，還原為預設淡色樣式。

       【判斷方式】
       取得 #hero 元素的高度，當 scrollY 小於此高度減去一點緩衝時，
       維持 hero-mode；超過後移除。
    ─────────────────────────────────────────────────────────── */
    const heroSection = document.getElementById('hero');
    const isHeroPage  = !!heroSection;

    // 如果是首頁，初始就設定 hero-mode（頁面頂端就是影片背景）
    if (isHeroPage) {
        header.classList.add('hero-mode');
    }

    function updateNav() {
        const scrollY    = window.scrollY;
        const heroHeight = isHeroPage ? heroSection.offsetHeight : 0;

        /* --- .scrolled：通用，往下捲超過 50px 就加深 --- */
        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        /* --- .hero-mode：首頁專用，在影片背景範圍內才啟用 ---
           heroHeight - 80：保留 80px 緩衝，讓過渡更平順 */
        if (isHeroPage) {
            if (scrollY < heroHeight - 80) {
                header.classList.add('hero-mode');
            } else {
                header.classList.remove('hero-mode');
            }
        }
    }

    // 捲動時更新
    window.addEventListener('scroll', updateNav, { passive: true });

    // 視窗縮放時重新計算（heroHeight 可能改變）
    window.addEventListener('resize', updateNav, { passive: true });
}


/* ══════════════════════════════════════════════════════════
   3. 手機版漢堡選單
   ══════════════════════════════════════════════════════════

   【運作邏輯】
   點擊漢堡按鈕 → 切換 .open class
   CSS 負責控制選單的顯示/隱藏動畫
   ══════════════════════════════════════════════════════════ */
function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (!toggle || !navLinks) return;

    // 點擊漢堡按鈕
    toggle.addEventListener('click', function () {
        // classList.toggle：有 class 就移除，沒有就加入
        toggle.classList.toggle('open');
        navLinks.classList.toggle('open');

        // 防止選單開啟時頁面捲動
        body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';

        // 無障礙屬性：告訴螢幕閱讀器選單狀態
        toggle.setAttribute(
            'aria-expanded',
            navLinks.classList.contains('open') ? 'true' : 'false'
        );
    });

    // 點擊選單中的連結後，自動關閉選單
    navLinks.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
            toggle.classList.remove('open');
            navLinks.classList.remove('open');
            body.style.overflow = '';
        });
    });

    // 點擊選單外的區域，關閉選單
    document.addEventListener('click', function (event) {
        // event.target：被點到的元素
        // .contains()：判斷某個元素是否包含在另一個元素內
        const isInsideNav = toggle.contains(event.target) ||
                            navLinks.contains(event.target);

        if (!isInsideNav && navLinks.classList.contains('open')) {
            toggle.classList.remove('open');
            navLinks.classList.remove('open');
            body.style.overflow = '';
        }
    });
}


/* ══════════════════════════════════════════════════════════
   4. 自動標記目前所在頁面的導覽連結
   ══════════════════════════════════════════════════════════

   【原理】
   取得目前頁面的檔名（例如 about.html），
   與每個導覽連結的 href 比對，
   相符的連結加上 .active class（CSS 會讓它變橘色）
   ══════════════════════════════════════════════════════════ */
function initActiveNavLink() {
    // 取得目前 URL 的最後一段（例如 'about.html'）
    const currentPage = window.location.pathname.split('/').pop();

    // 選取所有導覽連結
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(function (link) {
        // 取得連結的 href 屬性
        const linkHref = link.getAttribute('href');

        // 比對：連結的 href 包含目前頁面的檔名
        if (linkHref === currentPage ||
           (currentPage === '' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
}


/* ══════════════════════════════════════════════════════════
   5. 捲動進場動畫（Scroll Reveal）
   ══════════════════════════════════════════════════════════

   【什麼是 IntersectionObserver？】
   現代瀏覽器提供的 API，可以「觀察」元素是否進入視窗。
   比舊方法（監聽 scroll 事件 + 計算座標）更有效率。

   【使用方式】
   在 HTML 元素上加 class="reveal"（在 style.css 定義了初始隱藏狀態）
   當元素進入視窗時，自動加上 class="reveal visible"（顯現）

   範例：
   <div class="reveal">進入視窗才出現的內容</div>
   <div class="reveal reveal-delay-2">晚 200ms 出現</div>
   ══════════════════════════════════════════════════════════ */
function initScrollReveal() {
    // 選取所有需要動畫的元素（.reveal, .reveal-from-left, .reveal-from-right）
    const revealElements = document.querySelectorAll(
        '.reveal, .reveal-from-left, .reveal-from-right'
    );

    if (revealElements.length === 0) return;

    // 建立 IntersectionObserver 觀察器
    const observer = new IntersectionObserver(
        function (entries) {
            // entries：所有被觀察元素的狀態更新

            entries.forEach(function (entry) {
                // entry.isIntersecting：元素是否在視窗內
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');

                    // 動畫觸發後，停止觀察這個元素（效能優化）
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.15,    // 元素出現 15% 時觸發（不用等到完全進入）
            rootMargin: '0px 0px -50px 0px'
            // rootMargin：調整觸發範圍
            // 底部 -50px → 元素要再往上 50px 才觸發（避免太早出現）
        }
    );

    // 開始觀察每個元素
    revealElements.forEach(function (element) {
        observer.observe(element);
    });
}


/* ══════════════════════════════════════════════════════════
   6. 平滑捲動（Smooth Scroll）
   ══════════════════════════════════════════════════════════

   【說明】
   點擊頁面內的錨點連結（例如 href="#about-section"）時，
   讓頁面平滑捲動到目標位置，而不是瞬間跳過去。

   CSS 的 scroll-behavior: smooth 已處理大部分情況，
   這裡的 JS 版本用於需要更精確控制偏移量的場合
   （因為有固定導覽列，捲動目標要往上偏移導覽列高度）
   ══════════════════════════════════════════════════════════ */
function initSmoothScroll() {
    // 選取所有 href 以 # 開頭的錨點連結
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (event) {
            // 取得 href 的值（例如 '#about-section'）
            const targetId = this.getAttribute('href');

            // '#' 本身不是錨點，跳過
            if (targetId === '#') return;

            // 找到目標元素
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;

            // 阻止預設的跳轉行為
            event.preventDefault();

            // 計算要捲動到的位置（減去導覽列高度，避免被遮住）
            const navHeight = parseInt(
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--nav-height')
            );

            const targetPosition = targetElement.getBoundingClientRect().top
                                 + window.scrollY
                                 - (navHeight || 70);

            // 執行平滑捲動
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });
}


/* ══════════════════════════════════════════════════════════
   輔助工具函式（給其他頁面的 JS 使用）
   ══════════════════════════════════════════════════════════ */

/**
 * 節流函式（Throttle）
 *
 * 【用途】限制某個函式的執行頻率
 * 例如 scroll 事件每秒可能觸發 60 次，
 * 用 throttle 限制為每 100ms 最多執行一次，減少效能消耗。
 *
 * @param {Function} func  要節流的函式
 * @param {number}   limit 最小間隔毫秒數
 * @returns {Function}
 */
function throttle(func, limit) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

/**
 * 防抖函式（Debounce）
 *
 * 【用途】在連續觸發的事件「停止」後才執行
 * 例如視窗縮放（resize）事件，等使用者停止縮放後才重新計算。
 *
 * @param {Function} func  要防抖的函式
 * @param {number}   delay 等待毫秒數
 * @returns {Function}
 */
function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// 將工具函式掛到 window，讓其他 JS 檔案可以使用
window.ArtSiteUtils = { throttle, debounce };
