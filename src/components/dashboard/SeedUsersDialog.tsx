import { useState } from 'react'
import { Loader2, UserCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import api from '#/utils/axios'

export function SeedUsersDialog({ onSeeded }: { onSeeded: () => void }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(5)
  const [seeding, setSeeding] = useState(false)

  const handleSeed = async () => {
    if (count < 1 || count > 100) {
      toast.error('Count must be between 1 and 100')
      return
    }
    setSeeding(true)
    try {
      await api.post('/admin/seed-users', { count })
      toast.success(`Seeded ${count} test users`)
      setOpen(false)
      onSeeded()
    } catch {
      toast.error('Failed to seed users')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserCheck className="size-4 mr-1" />
          Seed Users
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seed Test Users</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="seedCount">Number of users (1–100)</Label>
          <Input
            id="seedCount"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Creates random <code>seed_*.example.com</code> users with generated passwords. Useful for testing only.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSeed} disabled={seeding}>
            {seeding ? <Loader2 className="size-4 animate-spin" /> : null}
            Seed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
