
import { test, expect } from '@playwright/test';

test('Navigation Drawer should be below App Bar', async ({ page }) => {
    // 设置大屏尺寸以确保 Drawer 显示
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    // 等待加载
    await expect(page.locator('.loading-page')).toBeHidden();
    
    // 获取 App Bar 和 Drawer
    const appBar = page.locator('.v-app-bar');
    const drawer = page.locator('.v-navigation-drawer');
    
    await expect(appBar).toBeVisible();
    await expect(drawer).toBeVisible();
    
    // 获取边界框
    const appBarBox = await appBar.boundingBox();
    const drawerBox = await drawer.boundingBox();
    
    if (!appBarBox || !drawerBox) {
        throw new Error('Could not get bounding box for app bar or drawer');
    }
    
    console.log('AppBar:', appBarBox);
    console.log('Drawer:', drawerBox);
    
    // 验证 Drawer 的顶部是否在 AppBar 的底部或下方
    // 允许一点点误差，或者正好相等
    expect(drawerBox.y).toBeGreaterThanOrEqual(appBarBox.y + appBarBox.height);
    
    // 验证 Drawer 没有覆盖 AppBar（Drawer 的 z-index 通常比 AppBar 低，但这里主要看位置）
    // 如果 Drawer 在 AppBar 下方，它的 y 坐标应该不仅仅是 0
    expect(drawerBox.y).toBeGreaterThan(0);
});

test('Main content should be to the right of Navigation Drawer', async ({ page }) => {
    // 设置大屏尺寸以确保 Drawer 显示且不覆盖内容
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('.loading-page')).toBeHidden();
    
    const drawer = page.locator('.v-navigation-drawer');
    const main = page.locator('.v-main');
    
    await expect(drawer).toBeVisible();
    await expect(main).toBeVisible();
    
    const drawerBox = await drawer.boundingBox();
    const mainBox = await main.boundingBox();
    
    if (!drawerBox || !mainBox) {
        throw new Error('Could not get bounding box');
    }
    
    console.log('Drawer:', drawerBox);
    console.log('Main:', mainBox);
    
    // Main content 的左边应该在 Drawer 的右边（或重叠，取决于实现，但在标准布局中 Main 会被推挤）
    // 实际上 Vuetify 的 v-main 会有 padding-left 等于 Drawer 的宽度
    // 或者 v-main 的内容区域（v-container）会在右侧
    
    // 检查 Main 的左边界是否大于等于 Drawer 的右边界（如果是 persistent drawer）
    // 或者检查 Main 的 padding-left
    const mainStyle = await main.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
            paddingLeft: style.paddingLeft,
            marginLeft: style.marginLeft
        };
    });
    
    console.log('Main Style:', mainStyle);
    
    // 验证 Main 确实被推到了右边
    // 注意：Drawer 宽度通常是 240px
    // 如果是 temporary drawer (mobile)，Main 不会被推挤
    // 这里是 desktop，drawer 是 persistent
    
    expect(parseInt(mainStyle.paddingLeft || '0')).toBeGreaterThanOrEqual(drawerBox.width);
});
