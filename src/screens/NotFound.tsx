import { useNavigate } from 'react-router'
import { Button, Card, EmptyState } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="p-space-md lg:p-space-xl max-w-xl mx-auto">
      <Card className="p-space-lg">
        <EmptyState
          icon="explore_off"
          title="This page doesn't exist"
          body="The link may be old or mistyped. Your stock and sales are safe."
          action={
            <Button icon="dashboard" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          }
        />
      </Card>
    </div>
  )
}
