(function() {
    'use strict';

    const PRESETS = {
        avatar: { width: 96, height: 96 },
        memberCard: { width: 160, height: 160 },
        profile: { width: 320, height: 320 },
        treeNode: { width: 128, height: 128 },
        dashboard: { width: 960, height: 720 }
    };

    function isDefaultAsset(url) {
        return typeof url === 'string' && (
            url.includes('/app/images/default-avatar.svg')
            || url.includes('/app/images/default-avatar.png')
        );
    }

    function shouldProxy(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('data:') || url.startsWith('blob:')) return false;
        if (isDefaultAsset(url)) return false;
        return true;
    }

    function toAbsoluteUrl(url) {
        try {
            return new URL(url, window.location.origin).toString();
        } catch (error) {
            return url;
        }
    }

    function buildImgproxyUrl(url, presetName = 'avatar') {
        if (!shouldProxy(url)) {
            return url;
        }

        const preset = PRESETS[presetName] || PRESETS.avatar;
        const sourceUrl = encodeURIComponent(toAbsoluteUrl(url));
        return `/imgproxy/unsafe/rs:fill:${preset.width}:${preset.height}:0/g:sm/plain/${sourceUrl}`;
    }

    window.PyebwaImageUtils = {
        buildImgproxyUrl,
        getMemberPhotoUrl(url, presetName = 'avatar') {
            return buildImgproxyUrl(url, presetName);
        }
    };
})();
