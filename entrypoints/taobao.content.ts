import { saveCapture } from '@/src/api/capture-api';
import { 从淘宝商品前端数据查询 } from '@/src/taobao-original';

export default defineContentScript({
    matches: ['https://item.taobao.com/item.htm*', 'https://detail.tmall.com/item.htm*'],
    allFrames: true,
    world: 'MAIN',
    async main() {
        const info = {
            标题: document.querySelector('[class^="mainTitle--"]')?.textContent || '',
            主图: [...document.querySelectorAll('[class^="thumbnail--"] img')].map((item: any) => item.src || ''),
            价格: document.querySelector('[class^="highlightPrice--"] > [class^="text--"]')?.textContent || '',
            店铺: document.querySelector('[class^="shopName--"]')?.textContent || '',
            详情: [...document.querySelectorAll('#imageTextInfo-container img')].map(i => {
                const url = i.getAttribute('data-src') || i.getAttribute('src');
                return url?.startsWith('http') ? url : `https:${url}`;
            })
        };
        const html = document.querySelector('body')?.innerHTML || '';
        var data =
            /var b = {.*for \(var k in a\)/
                .exec(html || '')?.[0]
                ?.replace('var b = ', '')
                .replace(';for (var k in a)', '') || '';
        const 淘宝商品前端数据 = JSON.parse(data);
        const 商品信息 = 从淘宝商品前端数据查询(淘宝商品前端数据.loaderData.home.data.res);
        const pageUrl = window.location.href || '';
        let itemId = '';
        itemId = new URL(pageUrl).searchParams.get('id') || itemId;
        console.log({
            pageUrl,
            platform: pageUrl.includes('tmall.com') ? 'tmall' : 'taobao',
            itemId,
            title: info.标题,
            shopName: info.店铺,
            finalPrice: info.价格,
            mainPicUrls: info.主图,
            detailPicUrls: info.详情,
            skus: 商品信息.map(sku => ({
                skuId: sku.规格编号,
                specName: sku.规格名称,
                priceText: sku.到手价,
                stockText: sku.库存
            })),
            raw: data
        });
        // return;
        await saveCapture({
            pageUrl,
            platform: pageUrl.includes('tmall.com') ? 'tmall' : 'taobao',
            itemId,
            title: info.标题,
            shopName: info.店铺,
            finalPrice: info.价格,
            mainPicUrls: info.主图,
            detailPicUrls: info.详情,
            skus: 商品信息.map(sku => ({
                skuId: sku.规格编号,
                specName: sku.规格名称,
                priceText: sku.到手价,
                stockText: sku.库存
            })),
            raw: data
        });
    }
});
