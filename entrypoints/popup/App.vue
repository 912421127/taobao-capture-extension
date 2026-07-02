<template>
    <main class="page">
        <Button type="primary" @click="openSidePanel">打开侧边栏</Button>
    </main>
</template>

<script lang="ts">
import { Button } from 'ant-design-vue';
export default {
    components: {
        Button
    },
    setup() {
        return {};
    },
    methods: {
        async openSidePanel() {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.id === undefined) {
                return;
            }
            chrome.sidePanel.open({
                tabId: tab.id
            });
        }
    }
};
</script>
