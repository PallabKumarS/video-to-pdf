import { ConvertFlow } from "@/components/features/convert-flow";

export default function ConvertPage() {
  return (
    <main className="min-h-screen bg-background/95 bg-[url('/grid.svg')] bg-center selection:bg-primary/30 flex items-center justify-center p-4 md:p-8">
      <ConvertFlow />
    </main>
  );
}
