export function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        )}
        <div className="px-6 py-4">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
