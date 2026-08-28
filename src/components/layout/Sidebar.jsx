import { Link } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white p-6">
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-6">Menu</h2>
          <nav className="space-y-3">
            <Link to="/dashboard" className="block px-3 py-2 rounded hover:bg-gray-800">Dashboard</Link>
            <Link to="/files" className="block px-3 py-2 rounded hover:bg-gray-800">Files</Link>
            <Link to="/settings" className="block px-3 py-2 rounded hover:bg-gray-800">Settings</Link>
          </nav>
        </div>
      </div>
    </aside>
  );
}
