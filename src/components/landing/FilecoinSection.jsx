import { Card } from '../common/Card';

export function FilecoinSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center">Why Filecoin Storage?</h2>
        <div className="grid grid-cols-3 gap-8">
          <Card>
            <h3 className="text-xl font-semibold mb-3">Decentralized</h3>
            <p className="text-gray-600">Secure storage across distributed providers worldwide.</p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-3">Reliable</h3>
            <p className="text-gray-600">Cryptographic proofs ensure your data is always protected.</p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-3">Cost-Effective</h3>
            <p className="text-gray-600">Competitive pricing with transparent marketplace dynamics.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}
