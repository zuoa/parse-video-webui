// DOM 元素获取
const urlInput = document.getElementById('videoUrl');
const parseBtn = document.getElementById('parseBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const resultSection = document.getElementById('resultSection');

// 结果区域元素
const authorAvatar = document.getElementById('authorAvatar');
const authorName = document.getElementById('authorName');
const authorUid = document.getElementById('authorUid');
const videoCover = document.getElementById('videoCover');
const videoCoverContainer = document.getElementById('videoCoverContainer');
const videoTitle = document.getElementById('videoTitle');
const videoDownload = document.getElementById('videoDownload');
const musicDownload = document.getElementById('musicDownload');
const coverDownload = document.getElementById('coverDownload');

// 视频播放器相关元素
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');
const playOverlay = document.getElementById('playOverlay');
const videoLoadingIndicator = document.getElementById('videoLoadingIndicator');
const videoMeta = document.getElementById('videoMeta');
const videoDuration = document.getElementById('videoDuration');
const videoSize = document.getElementById('videoSize');

// API 基础配置 - 现在调用Flask代理API
const API_BASE_URL = '';

// 当前视频数据
let currentVideoData = null;

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // 解析按钮点击事件
    parseBtn.addEventListener('click', handleParse);
    
    // 输入框回车事件
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleParse();
        }
    });
    
    // 输入框输入事件，清除之前的结果
    urlInput.addEventListener('input', function() {
        hideAllSections();
        resetVideoPlayer();
    });
    
    // 封面点击播放视频
    playOverlay.addEventListener('click', function() {
        playVideo();
    });
    
    // 设置视频播放器事件
    setupVideoPlayerEvents();
    
    // 下载按钮事件
    videoDownload.addEventListener('click', function() {
        if (currentVideoData && currentVideoData.video_url) {
            downloadFile(currentVideoData.video_url, 'video', generateFileName(currentVideoData.title, 'video'));
        }
    });
    
    musicDownload.addEventListener('click', function() {
        if (currentVideoData && currentVideoData.music_url) {
            downloadFile(currentVideoData.music_url, 'audio', generateFileName(currentVideoData.title, 'audio'));
        }
    });
    
    coverDownload.addEventListener('click', function() {
        if (currentVideoData && currentVideoData.cover_url) {
            // 使用代理后的封面URL进行下载
            const proxiedCoverUrl = getProxiedImageUrl(currentVideoData.cover_url);
            downloadFile(proxiedCoverUrl, 'cover', generateFileName(currentVideoData.title, 'cover'));
        }
    });
}

// 处理解析请求
async function handleParse() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('请输入视频分享链接');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('请输入有效的视频链接');
        return;
    }
    
    try {
        setLoadingState(true);
        hideAllSections();
        resetVideoPlayer();
        
        const result = await parseVideoUrl(url);
        currentVideoData = result;
        displayResult(result);
        
    } catch (error) {
        console.error('解析失败:', error);
        showError(error.message || '解析失败，请稍后重试');
    } finally {
        setLoadingState(false);
    }
}

// 调用API解析视频链接 - 通过Flask代理
async function parseVideoUrl(url) {
    const apiUrl = `${API_BASE_URL}/api/parse?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // 检查Flask API的响应格式
    if (result.error) {
        throw new Error(result.message || '解析失败');
    }
    
    // 验证返回数据格式
    if (!result.data || typeof result.data !== 'object') {
        throw new Error('服务器返回数据格式错误');
    }
    
    return result.data;
}

// 图片代理服务，用于防止跨域
function getProxiedImageUrl(originalUrl) {
    if (!originalUrl || originalUrl.startsWith('data:')) {
        return originalUrl;
    }
    return `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}`;
}

// 显示解析结果
function displayResult(data) {
    try {
        // 填充作者信息
        if (data.author) {
            const avatarUrl = data.author.avatar || '';
            authorAvatar.src = avatarUrl ? getProxiedImageUrl(avatarUrl) : '';
            authorAvatar.alt = data.author.name || '作者头像';
            authorName.textContent = data.author.name || '未知作者';
            authorUid.textContent = `UID: ${data.author.uid || '未知'}`;
            
            // 如果没有头像，使用默认头像
            if (!data.author.avatar) {
                authorAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.author.name || 'User')}&background=667eea&color=fff&size=100`;
            }
        }
        
        // 填充视频信息
        videoTitle.textContent = data.title || '未知标题';
        
        // 设置视频封面
        if (data.cover_url) {
            const proxiedCoverUrl = getProxiedImageUrl(data.cover_url);
            videoCover.src = proxiedCoverUrl;
            videoCover.alt = data.title || '视频封面';
            videoPlayer.poster = proxiedCoverUrl;
            
            console.log('原始封面URL:', data.cover_url);
            console.log('代理封面URL:', proxiedCoverUrl);
        } else {
            const defaultCover = 'data:image/svg+xml;base64,' + btoa(`
                <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#f0f0f0"/>
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="16" fill="#999">
                        暂无封面
                    </text>
                </svg>
            `);
            videoCover.src = defaultCover;
            videoPlayer.poster = defaultCover;
        }
        
        // 不在这里设置视频源，等用户点击播放时再设置
        // 重置视频播放器状态
        videoPlayer.removeAttribute('src');
        videoSource.removeAttribute('src');
        
        // 设置下载按钮状态
        setupDownloadButtons(data);
        
        // 显示结果区域
        resultSection.classList.remove('hidden');
        
        // 滚动到结果区域
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
    } catch (error) {
        console.error('显示结果时出错:', error);
        showError('显示结果时出现错误');
    }
}

// 播放视频
function playVideo() {
    if (!currentVideoData || !currentVideoData.video_url) {
        showError('无法播放视频，请尝试下载');
        return;
    }
    
    console.log('开始播放视频:', currentVideoData.video_url);
    
    // 显示视频加载状态
    showVideoLoading();
    
    // 构建代理URL
    const proxyVideoUrl = `${API_BASE_URL}/api/proxy/stream?url=${encodeURIComponent(currentVideoData.video_url)}`;
    console.log('代理视频URL:', proxyVideoUrl);
    
    // 先测试视频URL是否可访问
    testVideoUrl(proxyVideoUrl).then(isAccessible => {
        if (isAccessible) {
            console.log('视频URL可访问，开始播放');
            // 隐藏封面，显示视频播放器
            videoCoverContainer.classList.add('hidden');
            videoPlayer.classList.remove('hidden');
            
            // 设置视频源并播放
            videoSource.src = proxyVideoUrl;
            videoPlayer.load();
            
            // 播放视频
            videoPlayer.play().catch(error => {
                console.error('视频播放失败:', error);
                hideVideoLoading();
                showError('视频播放失败，请尝试下载观看');
                // 恢复封面显示
                videoCoverContainer.classList.remove('hidden');
                videoPlayer.classList.add('hidden');
                
                // 尝试备用播放方案
                tryAlternativePlay();
            });
        } else {
            console.error('视频URL不可访问');
            hideVideoLoading();
            showError('视频无法播放，可能需要下载观看');
            tryAlternativePlay();
        }
    });
}

// 测试视频URL是否可访问
async function testVideoUrl(url) {
    try {
        console.log('测试视频URL:', url);
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'cors'
        });
        console.log('URL测试结果:', response.status, response.statusText);
        return response.ok;
    } catch (error) {
        console.error('URL测试失败:', error);
        return false;
    }
}

// 尝试备用播放方案
function tryAlternativePlay() {
    if (!currentVideoData || !currentVideoData.video_url) return;
    
    console.log('尝试备用播放方案');
    
    // 方案1：直接使用原始URL
    const directUrl = currentVideoData.video_url;
    console.log('尝试直接播放:', directUrl);
    
    videoSource.src = directUrl;
    videoPlayer.load();
    
    const playPromise = videoPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log('直接播放成功');
            videoCoverContainer.classList.add('hidden');
            videoPlayer.classList.remove('hidden');
        }).catch(error => {
            console.error('直接播放也失败:', error);
            // 最后的备用方案：在新窗口打开
            showVideoPreviewMessage();
        });
    }
}

// 显示视频预览消息
function showVideoPreviewMessage() {
    // 创建预览消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'video-preview-message';
    
    const videoFileName = generateFileName(currentVideoData.title, 'video');
    const videoUrl = currentVideoData.video_url;
    
    messageDiv.innerHTML = `
        <div class="preview-message-content">
            <i class="fas fa-info-circle"></i>
            <p>视频无法在当前页面预览</p>
            <div class="preview-actions">
                <button class="preview-btn download-btn video-btn" onclick="downloadFile('${videoUrl.replace(/'/g, "\\'")}', 'video', '${videoFileName.replace(/'/g, "\\'")}')">
                    <i class="fas fa-download"></i>
                    下载观看
                </button>
                <button class="preview-btn download-btn cover-btn" onclick="openVideoInNewTab('${videoUrl.replace(/'/g, "\\'")}')">
                    <i class="fas fa-external-link-alt"></i>
                    新窗口打开
                </button>
            </div>
        </div>
    `;
    
    // 替换播放覆盖层
    const playOverlay = document.getElementById('playOverlay');
    if (playOverlay) {
        playOverlay.parentNode.replaceChild(messageDiv, playOverlay);
    }
}

// 在新窗口打开视频
function openVideoInNewTab(url) {
    const proxyUrl = `${API_BASE_URL}/api/proxy/stream?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, '_blank');
}

// 改进视频播放器事件监听
function setupVideoPlayerEvents() {
    videoPlayer.addEventListener('loadedmetadata', function() {
        console.log('视频元数据加载完成');
        hideVideoLoading();
        updateVideoMeta();
    });
    
    videoPlayer.addEventListener('loadeddata', function() {
        console.log('视频数据加载完成');
        hideVideoLoading();
    });
    
    videoPlayer.addEventListener('canplay', function() {
        console.log('视频可以播放');
        hideVideoLoading();
    });
    
    videoPlayer.addEventListener('error', function(e) {
        console.error('视频播放器错误:', e);
        const error = videoPlayer.error;
        if (error) {
            console.error('错误详情:', {
                code: error.code,
                message: error.message,
                MEDIA_ERR_ABORTED: error.MEDIA_ERR_ABORTED,
                MEDIA_ERR_NETWORK: error.MEDIA_ERR_NETWORK,
                MEDIA_ERR_DECODE: error.MEDIA_ERR_DECODE,
                MEDIA_ERR_SRC_NOT_SUPPORTED: error.MEDIA_ERR_SRC_NOT_SUPPORTED
            });
            
            let errorMessage = '视频加载失败';
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMessage = '视频加载被中断';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMessage = '网络错误，无法加载视频';
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMessage = '视频解码错误';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = '视频格式不支持';
                    break;
            }
            
            hideVideoLoading();
            showError(errorMessage + '，请尝试下载观看');
        }
        
        // 尝试备用播放方案
        setTimeout(() => {
            tryAlternativePlay();
        }, 1000);
    });
    
    videoPlayer.addEventListener('loadstart', function() {
        console.log('开始加载视频');
        showVideoLoading();
    });
    
    videoPlayer.addEventListener('progress', function() {
        if (videoPlayer.buffered.length > 0) {
            const buffered = (videoPlayer.buffered.end(0) / videoPlayer.duration) * 100;
            console.log('视频缓冲进度:', buffered.toFixed(2) + '%');
        }
    });
    
    videoPlayer.addEventListener('waiting', function() {
        console.log('视频缓冲中...');
        showVideoLoading();
    });
    
    videoPlayer.addEventListener('playing', function() {
        console.log('视频开始播放');
        hideVideoLoading();
    });
}

// 重置视频播放器
function resetVideoPlayer() {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    videoPlayer.classList.add('hidden');
    videoCoverContainer.classList.remove('hidden');
    videoMeta.classList.add('hidden');
    hideVideoLoading();
    
    // 清除视频源
    videoPlayer.removeAttribute('src');
    videoSource.removeAttribute('src');
    
    // 恢复播放覆盖层（如果被替换了）
    const existingMessage = videoCoverContainer.querySelector('.video-preview-message');
    if (existingMessage) {
        existingMessage.remove();
        
        // 重新创建播放覆盖层
        if (!document.getElementById('playOverlay')) {
            const playOverlay = document.createElement('div');
            playOverlay.id = 'playOverlay';
            playOverlay.className = 'play-overlay';
            playOverlay.innerHTML = '<i class="fas fa-play"></i>';
            playOverlay.addEventListener('click', function() {
                playVideo();
            });
            videoCoverContainer.appendChild(playOverlay);
        }
    }
    
    currentVideoData = null;
}

// 显示视频加载状态
function showVideoLoading() {
    videoLoadingIndicator.classList.remove('hidden');
}

// 隐藏视频加载状态
function hideVideoLoading() {
    videoLoadingIndicator.classList.add('hidden');
}

// 更新视频元信息
function updateVideoMeta() {
    if (videoPlayer.duration) {
        videoDuration.textContent = formatDuration(videoPlayer.duration);
        videoMeta.classList.remove('hidden');
    }
}

// 格式化时长
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// 设置下载按钮状态
function setupDownloadButtons(data) {
    // 视频下载按钮
    if (data.video_url) {
        videoDownload.classList.remove('hidden');
    } else {
        videoDownload.classList.add('hidden');
    }
    
    // 音频下载按钮
    if (data.music_url) {
        musicDownload.classList.remove('hidden');
    } else {
        musicDownload.classList.add('hidden');
    }
    
    // 封面下载按钮
    if (data.cover_url) {
        coverDownload.classList.remove('hidden');
    } else {
        coverDownload.classList.add('hidden');
    }
}

// 通过代理下载文件
async function downloadFile(url, type, filename) {
    try {
        showDownloadProgress(type);
        
        const proxyUrl = `${API_BASE_URL}/api/proxy/download?url=${encodeURIComponent(url)}&type=${type}&filename=${encodeURIComponent(filename)}`;
        
        // 创建临时链接下载
        const link = document.createElement('a');
        link.href = proxyUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideDownloadProgress(type);
        showSuccessMessage(`${getTypeDisplayName(type)}下载已开始`);
        
    } catch (error) {
        console.error('下载失败:', error);
        hideDownloadProgress(type);
        showError(`${getTypeDisplayName(type)}下载失败: ${error.message}`);
    }
}

// 显示下载进度
function showDownloadProgress(type) {
    const button = getDownloadButton(type);
    if (button) {
        button.disabled = true;
        const icon = button.querySelector('i');
        const text = button.querySelector('.btn-text') || button.childNodes[button.childNodes.length - 1];
        
        icon.className = 'fas fa-spinner fa-spin';
        if (text.textContent) {
            text.textContent = ' 下载中...';
        }
    }
}

// 隐藏下载进度
function hideDownloadProgress(type) {
    const button = getDownloadButton(type);
    if (button) {
        button.disabled = false;
        const icon = button.querySelector('i');
        
        switch (type) {
            case 'video':
                icon.className = 'fas fa-video';
                break;
            case 'audio':
                icon.className = 'fas fa-music';
                break;
            case 'cover':
                icon.className = 'fas fa-image';
                break;
        }
        
        // 恢复按钮文本
        const text = button.querySelector('.btn-text') || button.childNodes[button.childNodes.length - 1];
        if (text.textContent) {
            text.textContent = ` 下载${getTypeDisplayName(type)}`;
        }
    }
}

// 获取下载按钮
function getDownloadButton(type) {
    switch (type) {
        case 'video':
            return videoDownload;
        case 'audio':
            return musicDownload;
        case 'cover':
            return coverDownload;
        default:
            return null;
    }
}

// 获取类型显示名称
function getTypeDisplayName(type) {
    switch (type) {
        case 'video':
            return '视频';
        case 'audio':
            return '音频';
        case 'cover':
            return '封面';
        default:
            return '文件';
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    // 可以在这里添加成功提示的UI
    console.log(message);
}

// 生成下载文件名
function generateFileName(title, type) {
    const cleanTitle = (title || 'video').replace(/[^\w\s-]/g, '').trim();
    const timestamp = new Date().toISOString().slice(0, 10);
    
    switch (type) {
        case 'video':
            return `${cleanTitle}_${timestamp}.mp4`;
        case 'audio':
            return `${cleanTitle}_${timestamp}.mp3`;
        case 'cover':
            return `${cleanTitle}_cover_${timestamp}.jpg`;
        default:
            return `${cleanTitle}_${timestamp}`;
    }
}

// 设置加载状态
function setLoadingState(isLoading) {
    parseBtn.disabled = isLoading;
    
    if (isLoading) {
        parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 解析中...';
        loadingIndicator.classList.remove('hidden');
    } else {
        parseBtn.innerHTML = '<i class="fas fa-search"></i> 解析';
        loadingIndicator.classList.add('hidden');
    }
}

// 显示错误信息
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    
    // 5秒后自动隐藏错误信息
    setTimeout(() => {
        errorMessage.classList.add('hidden');
    }, 5000);
}

// 隐藏所有结果区域
function hideAllSections() {
    errorMessage.classList.add('hidden');
    resultSection.classList.add('hidden');
}

// URL 验证
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// 图片加载错误处理
authorAvatar.addEventListener('error', function() {
    console.log('作者头像加载失败，使用默认头像');
    this.src = `https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=100`;
});

videoCover.addEventListener('error', function() {
    console.log('视频封面加载失败，使用默认封面');
    const defaultCover = 'data:image/svg+xml;base64,' + btoa(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="16" fill="#999">
                图片加载失败
            </text>
        </svg>
    `);
    this.src = defaultCover;
    
    // 同时更新视频播放器的poster
    videoPlayer.poster = defaultCover;
});

// 复制链接功能（可选）
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('链接已复制到剪贴板');
        });
    }
}

// 键盘快捷键支持
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter 快速解析
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleParse();
    }
    
    // Escape 清除输入
    if (e.key === 'Escape') {
        urlInput.value = '';
        hideAllSections();
        resetVideoPlayer();
        urlInput.focus();
    }
    
    // 空格键播放/暂停视频
    if (e.key === ' ' && !videoPlayer.classList.contains('hidden')) {
        e.preventDefault();
        if (videoPlayer.paused) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    }
});

// 页面加载完成后自动聚焦输入框
window.addEventListener('load', function() {
    urlInput.focus();
}); 