import React from 'react';
import { CloudLightning, Github, Twitter, FileText } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-shamrock-darkest border-t border-gray-200 dark:border-shamrock-darker">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            {/* <CloudLightning className="h-6 w-6 text-shamrock" />
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">DeadlineGuard</span> */}
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-500 hover:text-shamrock">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-shamrock">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-500 hover:text-shamrock">
              <FileText className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Built on Filecoin. Storage you can verify.
        </div>
      </div>
    </footer>
  );
};

export default Footer;