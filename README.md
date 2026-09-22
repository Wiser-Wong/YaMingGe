# 雅名阁 · 生辰八字智能取名工具

> 结合生辰八字、五行平衡、音律、字型、数理与文化底蕴的智能取名网站。纯前端、无后端、无需登录，手机与电脑均可使用。
>
> 在线地址：** https://wiser-wong.github.io/YaMingGe/ **　　作者：祥宇(Skyline)

---

## 一、功能概览

| 页签 | 用途 | 说明 |
|---|---|---|
| **智能起名** | 批量出名、快速筛选 | 每批 200 个，七维评分，支持换一批、排序、按五行筛选 |
| **大师起名** | 精选少量高分名 | 结合期望、避讳字与五行补充，严格甄选 9 个并附大师总评 |
| **名字测试** | 给已有名字打分 | 输入完整姓名（自动识别复姓），查看七维评分与详细解析 |

三个页签共享姓氏、性别与生辰信息，切换页签无需重复填写。

## 二、使用说明

### 1. 填写基础信息

- **姓氏**：支持单姓与复姓（如 王、欧阳、司马），非汉字自动过滤。
- **性别**：男宝 / 女宝，影响用字倾向。
- **名字字数**：双字名 / 单字名。
- **出生日期与时辰（可选）**：填写后自动排八字，显示四柱、生肖、日主、五行分布与平衡建议。不填也能起名，只是不做八字契合分析。

> 八字采用「平衡制衡」模型：某一五行偏旺，则以克制之行为主用、泄耗之行为辅用；缺失五行酌情补或标为「慎补」；会助旺日主的五行标为「忌用」。评分按主用/辅用加分、忌用扣分。

### 2. 选择风格与方案

- **风格偏好（可多选）**：诗意古风、大气稳重、温婉柔美、阳光活力、儒雅书香、简约现代、吉祥富贵、自然清新。
- **起名方案（单选）**：

| 方案 | 特点 |
|---|---|
| 综合均衡 | 音形义、五行、数理全面兼顾 |
| 五行补益 | 优先补足八字所缺、所喜五行 |
| 音韵优美 | 平仄错落、读音响亮悦耳 |
| 诗词典故 | 取自诗经楚辞、唐诗宋词 |
| 数理吉祥 | 三才五格数理配置为吉 |
| 生肖宜用 | 结合出生生肖的宜用五行 |
| 独特脱俗 | 用字少见，降低重名率 |
| 浑然天成 | 姓与名连读成词，如 袁满（圆满）、程功（成功）、江帆 |

- **五行补充（可选，最多 2 项）**：手动指定名字需要补的五行。选两项时可切换：
  - **X+Y 组合**：双字名一字属 X、一字属 Y（如 木+水）；
  - **含 X 或 Y**：名字中含其一即可。
- **避讳字**：填入长辈名字等需要避开的字，生成时自动排除。

### 3. 查看结果

- 每张名片显示：姓名、拼音、每字五行、综合评分与简评；「浑然天成」方案会直接标注连读成词的缘由（如「谐「圆满」，圆圆满满」）。
- 点击名片打开**详情**：名字寓意、八字五行契合、七维评分（音律 / 字型 / 五行调和 / 寓意 / 独特性 / 文化底蕴 / 三才五格）、单字解析、五格数理与起名建议。
- 详情页可 **收藏** / **复制解析**；收藏保存在本机浏览器（localStorage），右上角「收藏」可随时查看。
- **换一批**：不会重复已展示过的名字。

### 4. 名字测试

在「名字测试」页输入完整姓名（如 欧阳子文），自动拆分姓氏与名字并给出七维评分、寓意与改进建议。

> 说明：本工具的字库、姓氏库与数理表均为内置静态数据，结果供参考娱乐，最终取名请结合家庭意愿与专业意见。

---

## 三、本地开发

环境：Node.js ≥ 18。

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器，默认 http://localhost:5180
npm run build        # 类型检查 + 生产构建，产物在 dist/
npm run preview      # 本地预览 dist/
```

技术栈：React 18 + Vite 6 + TypeScript 5，无后端、无第三方 UI 库。

```
src/
├─ components/   页面与组件（QuickNaming / MasterNaming / NameTest / NameCard / NameDetail …）
├─ data/         字库 characters.ts、补充字表 extraChars.ts、姓氏 surnames.ts、
│                数理 numerology.ts、浑然天成 natural.ts、谐音成词 homophone.ts
├─ utils/        八字 bazi.ts、评分 analysis.ts、生成 generator.ts、拼音 pinyin.ts …
├─ App.tsx / App.css
└─ main.tsx
```

---

## 四、发布为外部可访问的网站（GitHub Pages）

本项目通过 **GitHub Actions 自动部署到 GitHub Pages**，公开仓库永久免费、自带 HTTPS。

### 首次配置（只需一次）

1. **新建仓库**：在 https://github.com/new 创建一个 **Public** 仓库（私有仓库的 Pages 需付费），不要勾选任何初始化文件。
2. **推送代码**：
   ```bash
   cd naming-tool
   git init -b main
   git add .
   git commit -m "init"
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```
   推送时如需登录，密码处填 GitHub **Personal Access Token**（Settings → Developer settings → Personal access tokens），至少勾选 `repo`；若要从本地推送 `.github/workflows/` 下的文件，还需勾选 `workflow`。
3. **部署工作流**：仓库中已包含 `.github/workflows/deploy.yml`，每次 push 到 `main` 会自动 `npm ci` → `npm run build` → 发布 `dist/`。
   若 Token 没有 `workflow` 权限导致推送被拒，可在 GitHub 网页上手动新建该文件并粘贴内容。
4. **开启 Pages**：仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
5. 到 **Actions** 页签等待 "Deploy to GitHub Pages" 运行成功（约 1 分钟），访问地址为：

   ```
   https://<用户名>.github.io/<仓库名>/
   ```

   > `vite.config.ts` 中 `base: './'` 使用相对路径，因此无需为子路径额外配置。

### 日常更新

```bash
git add .
git commit -m "描述本次修改"
git push
```

推送后约 1 分钟线上自动更新。手机上若仍看到旧样式，是浏览器/微信缓存，刷新一次即可。

### 其他部署方式

同为静态站点，`npm run build` 后将 `dist/` 目录整体上传即可：

- **Vercel / Netlify / Cloudflare Pages**：导入仓库或直接拖入 `dist/`，免费且自动 HTTPS。
- **自有服务器**：将 `dist/` 放入 Nginx/Apache 静态目录即可，无需 Node 运行时。
- **局域网临时分享**：`npm run dev -- --host`，同一 WiFi 下访问 `http://<本机IP>:5180`。

---

## 五、免责声明

本工具所有分析基于传统姓名学与内置数据的算法推演，仅供参考与娱乐，不构成任何专业建议。
