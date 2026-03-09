/**
 * H5人脸验证组件
 * 支持活体检测、人脸比对等验证方式
 */

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

interface FaceVerifyProps {
  mode?: 'living' | 'compare'
  personId?: number
  certName?: string
  certNo?: string
  targetImage?: string
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  onCancel?: () => void
}

interface VerifyResult {
  ok: boolean
  passed: boolean
  message: string
  details?: any
}

export function FaceVerify({
  mode = 'living',
  personId,
  certName,
  certNo,
  targetImage,
  onSuccess,
  onError,
  onCancel
}: FaceVerifyProps) {
  const [step, setStep] = useState<'prepare' | 'capturing' | 'processing' | 'success' | 'error'>('prepare')
  const [errorMsg, setErrorMsg] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 开始摄像头
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }

      setStep('capturing')
    } catch (error) {
      console.error('摄像头启动失败:', error)
      setErrorMsg('无法访问摄像头，请检查权限设置')
      setStep('error')
    }
  }, [])

  // 停止摄像头
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // 拍照
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // 设置画布尺寸
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // 绘制视频帧
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 转换为base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageData)

    // 停止摄像头
    stopCamera()

    // 开始验证
    setStep('processing')
    performVerify(imageData)
  }, [stopCamera])

  // 执行验证
  const performVerify = async (imageBase64: string) => {
    try {
      // 移除base64前缀
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

      const requestBody: any = {
        mode,
        image: base64Data
      }

      if (personId != null) {
        requestBody.person_id = personId
      }

      if (mode === 'compare' && targetImage) {
        requestBody.target_image = targetImage
      }

      if (mode === 'full' && certName && certNo) {
        requestBody.cert_name = certName
        requestBody.cert_no = certNo
        requestBody.person_id = personId
        requestBody.meta_info = JSON.stringify({
          platform: 'h5',
          userAgent: navigator.userAgent
        })
      }

      const response = await fetch('/api/person/face-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('labor_worker_token')}`
        },
        body: JSON.stringify(requestBody)
      })

      const result: VerifyResult = await response.json()

      if (result.ok && result.passed) {
        setStep('success')
        onSuccess?.(result)
      } else {
        setStep('error')
        setErrorMsg(result.message || '验证失败')
        onError?.(result.message || '验证失败')
      }
    } catch (error) {
      console.error('验证请求失败:', error)
      setStep('error')
      setErrorMsg('网络请求失败，请重试')
      onError?.('网络请求失败')
    }
  }

  // 重试
  const handleRetry = () => {
    setErrorMsg('')
    setCapturedImage(null)
    setStep('prepare')
  }

  // 取消
  const handleCancel = () => {
    stopCamera()
    onCancel?.()
  }

  // 渲染准备界面
  const renderPrepare = () => (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <Camera className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold">人脸验证</h3>
      <p className="text-sm text-gray-500 text-center">
        {mode === 'living' 
          ? '请确保光线充足，面部无遮挡，按照提示完成活体检测'
          : '请确保面部清晰可见，与证件照进行比对'}
      </p>
      <div className="flex space-x-3 w-full">
        <Button variant="outline" className="flex-1" onClick={handleCancel}>
          取消
        </Button>
        <Button className="flex-1" onClick={startCamera}>
          开始验证
        </Button>
      </div>
    </div>
  )

  // 渲染拍摄界面
  const renderCapturing = () => (
    <div className="flex flex-col space-y-4">
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* 人脸框引导 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-sm text-gray-500 text-center">
        请将面部对准圆框内，保持静止后点击拍照
      </p>
      <div className="flex space-x-3">
        <Button variant="outline" className="flex-1" onClick={handleCancel}>
          取消
        </Button>
        <Button className="flex-1" onClick={capturePhoto}>
          拍照
        </Button>
      </div>
    </div>
  )

  // 渲染处理中界面
  const renderProcessing = () => (
    <div className="flex flex-col items-center space-y-4 p-8">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <h3 className="text-lg font-semibold">验证中...</h3>
      <p className="text-sm text-gray-500">正在进行人脸比对和活体检测</p>
      {capturedImage && (
        <img 
          src={capturedImage} 
          alt="Captured" 
          className="w-32 h-32 object-cover rounded-lg"
        />
      )}
    </div>
  )

  // 渲染成功界面
  const renderSuccess = () => (
    <div className="flex flex-col items-center space-y-4 p-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-green-600">验证通过</h3>
      <p className="text-sm text-gray-500">人脸验证成功，可以继续后续操作</p>
    </div>
  )

  // 渲染失败界面
  const renderError = () => (
    <div className="flex flex-col items-center space-y-4 p-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-red-600">验证失败</h3>
      <p className="text-sm text-gray-500 text-center">{errorMsg || '请确保光线充足，面部清晰可见'}</p>
      <div className="flex space-x-3 w-full">
        <Button variant="outline" className="flex-1" onClick={handleCancel}>
          取消
        </Button>
        <Button className="flex-1" onClick={handleRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-md mx-auto">
      {step === 'prepare' && renderPrepare()}
      {step === 'capturing' && renderCapturing()}
      {step === 'processing' && renderProcessing()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
    </Card>
  )
}

export default FaceVerify
