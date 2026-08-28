import { Button } from '../common/Button';

export function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-6">Missing Your Storage Deadlines?</h1>
        <p className="text-xl text-blue-100 mb-8">DeadlineGuard monitors your Filecoin storage agreements and alerts you before expiry.</p>
        <Button variant="outline" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
          Get Started
        </Button>
      </div>
    </section>
  );
}
