// 这个文件是 WXT 的总配置文件。
// 你可以把它理解为“插件工程的说明书”：插件叫什么、需要哪些权限、哪些网站可以被读取。
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'wxt';

export default defineConfig({
    // 明确告诉 WXT 构建 Manifest V3 插件。
    manifestVersion: 3,

    // manifest 里的内容会被 WXT 自动合并到最终的浏览器插件配置中。
    manifest: {
        name: '淘宝商品前端数据查询',
        description: '打开商品详情页后，点击按钮提取当前页标题和 SKU。',
        version: '0.1.0',
        // tabs：点击按钮时获取当前活动标签页。
        // scripting：点击按钮后在当前商品页里执行一次读取 body.innerHTML 的脚本。
        permissions: [
            'accessibilityFeatures.modify',
            'accessibilityFeatures.read',
            'activeTab',
            'alarms',
            'audio',
            'background',
            'bookmarks',
            'browsingData',
            'certificateProvider',
            'clipboardRead',
            'clipboardWrite',
            'contentSettings',
            'contextMenus',
            'cookies',
            'debugger',
            'declarativeContent',
            'declarativeNetRequest',
            'declarativeNetRequestWithHostAccess',
            'declarativeNetRequestFeedback',
            'dns',
            'desktopCapture',
            'documentScan',
            'downloads',
            'downloads.open',
            'downloads.ui',
            'enterprise.deviceAttributes',
            'enterprise.hardwarePlatform',
            'enterprise.networkingAttributes',
            'enterprise.platformKeys',
            'favicon',
            'fileBrowserHandler',
            'fileSystemProvider',
            'fontSettings',
            'gcm',
            'geolocation',
            'history',
            'identity',
            'identity.email',
            'idle',
            'loginState',
            'management',
            'nativeMessaging',
            'notifications',
            'offscreen',
            'pageCapture',
            'platformKeys',
            'power',
            'printerProvider',
            'printing',
            'printingMetrics',
            'privacy',
            'processes',
            'proxy',
            'readingList',
            'runtime',
            'scripting',
            'search',
            'sessions',
            'sidePanel',
            'storage',
            'system.cpu',
            'system.display',
            'system.memory',
            'system.storage',
            'tabCapture',
            'tabGroups',
            'tabs',
            'topSites',
            'tts',
            'ttsEngine',
            'unlimitedStorage',
            'vpnProvider',
            'wallpaper',
            'webAuthenticationProxy',
            'webNavigation',
            'webRequest',
            'webRequestBlocking'
        ],
        // 允许读取商品页，同时允许把采集结果发送到本机 Docker 后端。
        host_permissions: ['<all_urls>', 'http://localhost:3001/*'],
        action: {
            default_title: '淘宝商品前端数据查询'
        }
    },
    // WXT 本身使用 Vite 打包；这里把 Vue 插件加进去，popup 就能使用 .vue 单文件组件。
    vite: () => ({
        plugins: [vue()]
    })
});
