export const searchTaobao = async (id: string | chrome.tabs.Tab) => {
  const tab =
    typeof id == "string"
      ? await chrome.tabs.create({
          url: "https://detail.tmall.com/item.htm?id=" + id,
          active: true,
        })
      : id;
  const tabId = tab.id;
  if (!tabId) {
    throw new Error("未找到商品价格数据");
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const [{ result: html }] = await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    func: () => document.querySelector("body")?.innerHTML || "",
  });
  if (typeof id == "string") {
    chrome.tabs.remove(tabId);
  }
  const data = /var b = {.*for \(var k in a\)/
    .exec(html || "")?.[0]
    ?.replace("var b = ", "")
    .replace(";for (var k in a)", "");
  if (!data) {
    throw new Error("未找到商品价格数据");
  }
  return JSON.parse(data);
};

export const 从淘宝商品前端数据查询 = (data: any, separator: string = " ") => {
  const { skuCore, skuBase } = data;

  // 构建 pid → (vid → 规格名) 映射
  const propMap: Record<string, Record<string, string>> = {};
  for (const prop of skuBase.props) {
    const map: Record<string, string> = {};
    for (const v of prop.values) {
      map[v.vid] = v.name;
    }
    propMap[prop.pid] = map;
  }

  // 排除无规格默认项 "0"
  const skuIds = Object.keys(skuCore.sku2info).filter((id) => id !== "0");

  const result: {
    规格编号: string;
    规格名称: string;
    到手价: string;
    库存: string;
  }[] = [];
  for (const skuId of skuIds) {
    const skuBaseItem = skuBase.skus.find((s: any) => s.skuId === skuId);
    if (!skuBaseItem) continue;

    const parts = skuBaseItem.propPath.split(";");
    const specNames: string[] = [];
    for (const part of parts) {
      const [pid, vid] = part.split(":");
      if (pid && vid) {
        const name = propMap[pid]?.[vid];
        specNames.push(name || `未知(${pid}:${vid})`);
      }
    }
    // 使用空格连接多个规格值
    const specName = specNames.join(" ");

    const info = skuCore.sku2info[skuId];
    result.push({
      规格编号: skuId,
      规格名称: specName,
      到手价: info.price.priceText,
      库存: info.quantityText,
    });
  }
  return result;
};
