export default function Preview() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <iframe
        src="https://andreasplenge.com"
        className="flex-1 w-full border-0"
        title="andreasplenge.com"
      />
    </div>
  );
}
