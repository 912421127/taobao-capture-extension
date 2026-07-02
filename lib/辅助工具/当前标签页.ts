import { ref } from "vue";
export const 当前标签页链接 = ref("");
export const 当前标签页 = ref<chrome.tabs.Tab>();

const 链接变化 = (url: string | undefined) => {
  当前标签页链接.value = url || "";
};

const 标签页变化 = (tab: chrome.tabs.Tab) => {
  当前标签页.value = tab;
  链接变化(tab.url);
};

const 标签页发送变化 = () => {
  chrome.tabs.query(
    {
      active: true,
      lastFocusedWindow: true,
    },
    (tabs) => {
      if (tabs.length === 0) {
        return;
      }
      const tab = tabs[0];
      if (tab.id !== 当前标签页.value?.id) {
        标签页变化(tab);
      }
    },
  );
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (tabId === 当前标签页.value?.id) {
    if (changeInfo.url != undefined) {
      当前标签页链接.value = changeInfo.url;
    }
  }
});
chrome.tabs.onActivated.addListener(标签页发送变化);
chrome.windows.onFocusChanged.addListener(标签页发送变化);
