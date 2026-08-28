import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import FileUpload from '../components/file/FileUpload';
import { Upload, FileText, BookOpen, Calendar } from 'lucide-react';

const UploadPage = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id);
      if (!error) setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const handleUploadComplete = (file) => {
    // Optionally navigate to file details
    console.log('Upload complete:', file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Upload className="h-6 w-6 text-shamrock" /> Upload File
      </h1>

      {/* Academic metadata form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            <BookOpen className="inline h-4 w-4 mr-1" /> Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 bg-shamrock-darker/30 border border-shamrock-darker rounded-md text-white"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            <FileText className="inline h-4 w-4 mr-1" /> Assignment Title
          </label>
          <input
            type="text"
            value={assignmentTitle}
            onChange={(e) => setAssignmentTitle(e.target.value)}
            placeholder="e.g., Senior Project Final"
            className="w-full px-3 py-2 bg-shamrock-darker/30 border border-shamrock-darker rounded-md text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            <Calendar className="inline h-4 w-4 mr-1" /> Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 bg-shamrock-darker/30 border border-shamrock-darker rounded-md text-white"
          />
        </div>
      </div>

      {/* File upload component (already includes metadata insertion) */}
      <FileUpload onUploadComplete={handleUploadComplete} />
    </div>
  );
};

export default UploadPage;