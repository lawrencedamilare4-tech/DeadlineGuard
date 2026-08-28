import { Card } from '../common/Card';

export function FileDetails({ file }) {
  if (!file) {
    return <Card><p className="text-gray-500">No file selected</p></Card>;
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">{file.name}</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Size</span>
          <span className="font-medium">{file.size}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Type</span>
          <span className="font-medium">{file.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Status</span>
          <span className="font-medium text-green-600">{file.status}</span>
        </div>
      </div>
    </Card>
  );
}
