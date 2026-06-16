import { ConvertFlow } from "@/components/features/convert-flow";

export default function ConvertPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden selection:bg-primary/30 flex items-center justify-center p-4 md:p-8">
      {/* Background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[5%] w-100 h-100 bg-primary/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[10%] w-87.5 h-87.5 bg-violet-500/8 rounded-full blur-[120px] animate-float-delayed" />
      </div>
      <ConvertFlow />
    </main>
  );
}
