import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-foreground">FieldFlow CRM</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground">
            Pipeline-based CRM for landscape professionals.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge>Lead</Badge>
            <Badge variant="secondary">Consultation</Badge>
            <Badge variant="outline">Proposal</Badge>
          </div>
          <div className="flex gap-2">
            <Button>Primary Action</Button>
            <Button variant="outline">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
