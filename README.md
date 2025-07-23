# 视频解析器 - 小而美

一个简洁美观的视频解析下载工具，支持解析视频分享链接并提供多种下载选项。

## ✨ 特性

- 🎥 **视频解析**: 支持主流视频平台的分享链接解析
- 📱 **响应式设计**: 适配桌面和移动端设备
- 🎨 **现代化UI**: 简洁美观的用户界面
- ⚡ **快速下载**: 支持视频、音频、封面图下载
- 🔄 **实时反馈**: 加载状态和错误提示
- ⌨️ **快捷键支持**: 支持键盘快捷操作

## 🚀 快速开始

### 前置要求

确保你的视频解析服务已经在 `http://127.0.0.1:8080` 运行。

### 安装和运行

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd parse-video-webui
   ```

2. **安装Python依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **启动Flask应用**
   ```bash
   python app.py
   ```

4. **访问应用**
   ```
   http://localhost:5000
   ```

### 项目结构
```
parse-video-webui/
├── app.py              # Flask主应用
├── requirements.txt    # Python依赖
├── templates/         
│   └── index.html     # 主页模板
├── static/
│   ├── css/
│   │   └── style.css  # 样式文件
│   └── js/
│       └── script.js  # JavaScript逻辑
└── README.md
```

## 🎯 使用指南

1. **输入视频链接**: 在输入框中粘贴视频分享链接
2. **点击解析**: 点击"解析"按钮或按回车键
3. **查看结果**: 等待解析完成，查看视频信息
4. **下载内容**: 点击相应按钮下载视频、音频或封面

## ⌨️ 快捷键

- `Enter`: 解析视频链接
- `Ctrl/Cmd + Enter`: 快速解析
- `Escape`: 清除输入并重新聚焦

## 🔧 API 接口

### Flask代理接口

应用通过Flask代理API进行视频解析，避免CORS问题：

```
GET /api/parse?url={视频分享链接}
GET /api/health  # 健康检查
```

**解析接口返回格式:**
```json
{
  "error": false,
  "data": {
    "author": {
      "uid": "用户ID",
      "name": "用户名",
      "avatar": "头像URL"
    },
    "title": "视频标题",
    "video_url": "视频下载链接",
    "music_url": "音频下载链接",
    "cover_url": "封面图片链接",
    "images": [],
    "image_live_photos": []
  }
}
```

**错误响应格式:**
```json
{
  "error": true,
  "message": "错误信息"
}
```

### 外部服务

Flask应用会代理调用以下外部API：
```
GET http://127.0.0.1:8080/video/share/url/parse?url={视频分享链接}
```

## 🎨 界面预览

- **渐变背景**: 现代化的紫色渐变背景
- **卡片设计**: 干净的白色卡片布局
- **图标支持**: 使用 Font Awesome 图标
- **动画效果**: 平滑的过渡和悬停效果
- **状态反馈**: 清晰的加载和错误状态

## 📱 响应式支持

- 桌面端: 最佳的宽屏体验
- 平板端: 适配中等屏幕
- 移动端: 优化的触摸体验

## 🛠️ 技术栈

### 后端
- **Flask**: Python Web框架
- **Flask-CORS**: 跨域支持
- **Requests**: HTTP请求库
- **Gunicorn**: WSGI服务器

### 前端
- **HTML5**: 语义化标记
- **CSS3**: 现代化样式和动画
- **Vanilla JavaScript**: 原生JS，无依赖
- **Font Awesome**: 图标库
- **Fetch API**: 网络请求

## 📝 注意事项

1. 确保视频解析服务正常运行
2. 某些浏览器可能需要HTTPS环境才能正常下载
3. 大文件下载可能需要一些时间
4. 建议使用现代浏览器以获得最佳体验

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来完善这个项目！

---

❤️ 用心打造的简洁美观的视频解析工具 