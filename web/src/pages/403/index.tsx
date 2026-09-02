import { SemanticButton } from '@/components/SemanticButton'
import { useNavigate } from 'react-router-dom'

export default function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-layout">
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-lg font-semibold">403</h2>
        <p className="text-sm text-gray-500">抱歉，您没有权限访问此页面。</p>
        <SemanticButton onClick={() => navigate('/')}>返回首页</SemanticButton>
      </div>
    </div>
  )
}
