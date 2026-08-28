import React, { useState } from 'react';
import FileUpload from '../components/file/FileUpload';
import { Upload, FileText, BookOpen, Calendar, Percent } from 'lucide-react';

const UploadPage = () => {
  const [courseName, setCourseName] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [gradeWeight, setGradeWeight] = useState(20);
  const [formError, setFormError] = useState(null);
  const [file, setFile] = useState(null);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setFormError(null);
  };

  const isFormValid = () => {
    if (!courseName.trim()) return 'Course name is required.';
    if (!assignmentTitle.trim()) return 'Assignment title is required.';
    if (!dueDate) return 'Due date is required.';
    if (!gradeWeight || gradeWeight <= 0 || gradeWeight > 100) return 'Grade weight must be between 1-100.';
    if (!file) return 'Please select a file.';
    return null;
  };

  const academicMeta = {
    courseName: courseName.trim(),
    assignmentTitle: assignmentTitle.trim(),
    dueDate,
    gradeWeight: Number(gradeWeight),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Upload className="h-6 w-6 text-shamrock" /> Upload File
      </h1>

      {/* Academic Details Form */}
      <div className="bg-white dark:bg-shamrock-darkest rounded-lg border border-gray-200 dark:border-shamrock-darker p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Academic Details (Required)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Course Name (Text Input) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <BookOpen className="inline h-4 w-4 mr-1 text-shamrock" /> Course Name *
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., Computer Science 101"
              className="w-full px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          {/* Assignment Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-1 text-shamrock" /> Assignment Title *
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="e.g., Senior Project Final"
              className="w-full px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1 text-shamrock" /> Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock"
              required
            />
          </div>

          {/* Grade Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Percent className="inline h-4 w-4 mr-1 text-shamrock" /> Grade Weight (%) *
            </label>
            <input
              type="number"
              value={gradeWeight}
              onChange={(e) => setGradeWeight(Number(e.target.value))}
              min="1"
              max="100"
              placeholder="e.g., 20"
              className="w-full px-3 py-2 border border-gray-300 dark:border-shamrock-darker rounded-md bg-white dark:bg-shamrock-darker text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-shamrock placeholder-gray-400 dark:placeholder-gray-500"
              required
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          * All fields are required before uploading.
        </p>
      </div>

      {/* File Upload with academic metadata */}
      <FileUpload 
        academicMeta={academicMeta}
        onFileSelect={handleFileSelect}
        validateForm={isFormValid}
      />
    </div>
  );
};

export default UploadPage;