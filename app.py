import logging
import os
from urllib.parse import urlparse

import requests
from flask import Flask, render_template, jsonify, request, Response
from flask.cli import load_dotenv
from flask_cors import CORS

load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用CORS支持

# 外部API配置
EXTERNAL_API_BASE_URL = os.environ.get("PARSER_URL")


@app.route('/')
def index():
    """主页路由"""
    return render_template('index.html')


@app.route('/api/parse', methods=['GET'])
def parse_video():
    """代理视频解析API"""
    try:
        # 获取URL参数
        video_url = request.args.get('url')

        if not video_url:
            return jsonify({
                'error': True,
                'message': '缺少URL参数'
            }), 400

        # 构建外部API请求
        external_url = f"{EXTERNAL_API_BASE_URL}/video/share/url/parse"
        params = {'url': video_url}

        logger.info(f"{external_url} 正在解析视频: {video_url}")

        # 调用外部API
        response = requests.get(external_url, params=params, timeout=30)

        # 检查响应状态
        if response.status_code == 200:
            data = response.json()
            if data.get('code') == 200:
                logger.info("视频解析成功")
                return jsonify({
                    'error': False,
                    'data': data.get('data')
                })
            else:
                logger.error(f"解析服务返回错误: {data.get('msg', '未知错误')}")
                return jsonify({
                    'error': True,
                    'message': data.get('msg', '解析服务返回错误')
                }), 500
        else:
            logger.error(f"外部API返回错误: {response.status_code}")
            return jsonify({
                'error': True,
                'message': f'解析服务返回错误: {response.status_code}'
            }), response.status_code

    except requests.exceptions.Timeout:
        logger.error("请求超时")
        return jsonify({
            'error': True,
            'message': '请求超时，请稍后重试'
        }), 408

    except requests.exceptions.ConnectionError:
        logger.error("连接失败")
        return jsonify({
            'error': True,
            'message': '无法连接到解析服务，请检查服务是否运行'
        }), 503

    except requests.exceptions.RequestException as e:
        logger.error(f"请求异常: {str(e)}")
        return jsonify({
            'error': True,
            'message': f'请求异常: {str(e)}'
        }), 500

    except Exception as e:
        logger.error(f"未知错误: {str(e)}")
        return jsonify({
            'error': True,
            'message': '服务器内部错误'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    try:
        # 测试外部API连接
        response = requests.get(f"{EXTERNAL_API_BASE_URL}/", timeout=5)
        external_service_status = response.status_code == 200
    except:
        external_service_status = False

    return jsonify({
        'status': 'healthy',
        'external_service': 'connected' if external_service_status else 'disconnected'
    })


@app.route('/api/proxy/download')
def proxy_download():
    """代理下载接口，避免403 Forbidden错误"""
    try:
        # 获取参数
        url = request.args.get('url')
        file_type = request.args.get('type', 'video')  # video, audio, cover
        filename = request.args.get('filename', 'download')

        if not url:
            return jsonify({
                'error': True,
                'message': '缺少URL参数'
            }), 400

        logger.info(f"代理下载: {url}")

        # 设置请求头，模拟浏览器请求，避免防盗链
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'video' if file_type == 'video' else 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
        }

        # 根据URL设置特定的Referer
        try:
            parsed_url = urlparse(url)
            domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
            headers['Referer'] = domain
        except:
            pass

        # 发起请求
        response = requests.get(url, headers=headers, stream=True, timeout=30)

        if response.status_code != 200:
            logger.error(f"代理下载失败: {response.status_code}")
            return jsonify({
                'error': True,
                'message': f'下载失败: {response.status_code}'
            }), response.status_code

        # 获取内容类型
        content_type = response.headers.get('Content-Type', 'application/octet-stream')

        # 根据文件类型设置默认的内容类型
        if file_type == 'video' and 'video' not in content_type:
            content_type = 'video/mp4'
        elif file_type == 'audio' and 'audio' not in content_type:
            content_type = 'audio/mpeg'
        elif file_type == 'cover' and 'image' not in content_type:
            content_type = 'image/jpeg'

        # 设置响应头
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk

        # 创建响应
        flask_response = Response(
            generate(),
            mimetype=content_type,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': response.headers.get('Content-Length', ''),
                'Accept-Ranges': 'bytes',
            }
        )

        return flask_response

    except requests.exceptions.Timeout:
        logger.error("下载请求超时")
        return jsonify({
            'error': True,
            'message': '下载超时，请稍后重试'
        }), 408

    except requests.exceptions.ConnectionError:
        logger.error("下载连接失败")
        return jsonify({
            'error': True,
            'message': '无法连接到资源服务器'
        }), 503

    except Exception as e:
        logger.error(f"代理下载异常: {str(e)}")
        return jsonify({
            'error': True,
            'message': '下载服务异常'
        }), 500


@app.route('/api/proxy/stream')
def proxy_stream():
    """代理视频流，用于在线播放"""
    try:
        url = request.args.get('url')

        if not url:
            return jsonify({
                'error': True,
                'message': '缺少URL参数'
            }), 400

        logger.info(f"代理视频流: {url}")

        # 设置请求头
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
        }

        # 处理Range请求 (用于视频播放器的分段加载)
        range_header = request.headers.get('Range')
        if range_header:
            headers['Range'] = range_header
            logger.info(f"Range请求: {range_header}")

        # 设置Referer
        try:
            parsed_url = urlparse(url)
            domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
            headers['Referer'] = domain
            logger.info(f"设置Referer: {domain}")
        except Exception as e:
            logger.warning(f"无法解析URL设置Referer: {e}")

        # 发起请求
        logger.info(f"发起请求到: {url}")
        response = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)

        logger.info(f"响应状态码: {response.status_code}")
        logger.info(f"响应头: {dict(response.headers)}")

        if response.status_code not in [200, 206]:  # 206 for partial content
            logger.error(f"代理流失败: {response.status_code} - {response.text}")
            return jsonify({
                'error': True,
                'message': f'流媒体访问失败: {response.status_code} - {response.reason}'
            }), response.status_code

        # 生成流式响应
        def generate():
            try:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            except Exception as e:
                logger.error(f"流生成错误: {e}")

        # 获取内容类型
        content_type = response.headers.get('Content-Type', 'video/mp4')
        content_length = response.headers.get('Content-Length', '')
        content_range = response.headers.get('Content-Range', '')

        logger.info(f"Content-Type: {content_type}")
        logger.info(f"Content-Length: {content_length}")

        # 创建响应
        flask_response = Response(
            generate(),
            status=response.status_code,
            mimetype=content_type,
            headers={
                'Accept-Ranges': 'bytes',
                'Content-Length': content_length,
                'Content-Range': content_range,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                'Access-Control-Allow-Headers': 'Range, Content-Type',
                'Cross-Origin-Resource-Policy': 'cross-origin',
            }
        )

        return flask_response

    except requests.exceptions.Timeout:
        logger.error("流媒体请求超时")
        return jsonify({
            'error': True,
            'message': '流媒体请求超时'
        }), 408

    except requests.exceptions.ConnectionError as e:
        logger.error(f"流媒体连接失败: {e}")
        return jsonify({
            'error': True,
            'message': '无法连接到流媒体服务器'
        }), 503

    except Exception as e:
        logger.error(f"代理流异常: {str(e)}")
        return jsonify({
            'error': True,
            'message': f'流媒体服务异常: {str(e)}'
        }), 500


@app.route('/api/proxy/stream', methods=['OPTIONS'])
def proxy_stream_options():
    """处理OPTIONS预检请求"""
    response = Response()
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type'
    return response


@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    return jsonify({
        'error': True,
        'message': '接口不存在'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    return jsonify({
        'error': True,
        'message': '服务器内部错误'
    }), 500


if __name__ == '__main__':
    print("🚀 视频解析器服务启动中...")
    print("📱 访问地址: http://localhost:5000")
    print("🔧 API健康检查: http://localhost:5000/api/health")
    print("=" * 50)

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
