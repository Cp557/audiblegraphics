import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default async function PrivacyPage() {
  const filePath = path.join(process.cwd(), 'PRIVACY.md');
  const fileContents = fs.readFileSync(filePath, 'utf8');

  return (
    <div className="max-w-3xl mx-auto py-16 px-6 prose prose-slate">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContents}</ReactMarkdown>
    </div>
  );
}

