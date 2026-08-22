export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t px-4 py-3 text-muted-foreground">
      <div className="flex items-center justify-between text-xs">
        <p>&copy; {year} BP Admin Panel</p>
      </div>
    </footer>
  )
}
