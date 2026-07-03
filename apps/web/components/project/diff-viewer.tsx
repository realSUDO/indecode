"use client";

import React, { useMemo } from "react";
import { AlertCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface Issue {
  id: string;
  severity: "blocking" | "high" | "suggestion";
  title: string;
  description: string;
  filePath?: string;
  lineNumber?: number;
  suggestion?: string;
}

interface DiffViewerProps {
  diffStr: string;
  issues: Issue[];
}

export function DiffViewer({ diffStr, issues }: DiffViewerProps) {
  // Parse the raw diff into files
  const files = useMemo(() => {
    const lines = diffStr.split("\n");
    const parsedFiles: any[] = [];
    let currentFile: any = null;

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        if (currentFile) parsedFiles.push(currentFile);
        currentFile = { name: "", diffLines: [], oldStart: 0, newStart: 0 };
        const match = line.match(/ b\/(.+)$/);
        if (match) currentFile.name = match[1];
      } else if (currentFile) {
        currentFile.diffLines.push(line);
      }
    }
    if (currentFile) parsedFiles.push(currentFile);

    return parsedFiles;
  }, [diffStr]);

  return (
    <div className="space-y-6">
      {files.map((file, idx) => (
        <DiffFile key={idx} file={file} issues={issues.filter(i => i.filePath === file.name)} />
      ))}
    </div>
  );
}

function DiffFile({ file, issues }: { file: any; issues: Issue[] }) {
  let oldLineNum = 0;
  let newLineNum = 0;

  const renderedLines = file.diffLines.map((line: string, index: number) => {
    let type = "context";
    let bgClass = "bg-transparent hover:bg-white/5";
    let textClass = "text-neutral-300";
    let oldNum: string | number = "";
    let newNum: string | number = "";

    if (line.startsWith("@@ ")) {
      type = "chunk";
      bgClass = "bg-blue-500/10";
      textClass = "text-blue-400";
      // Parse @@ -1,4 +1,5 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1] as string, 10);
        newLineNum = parseInt(match[2] as string, 10);
      }
    } else if (line.startsWith("-")) {
      type = "delete";
      bgClass = "bg-red-500/15";
      textClass = "text-red-400";
      oldNum = oldLineNum++;
    } else if (line.startsWith("+")) {
      type = "insert";
      bgClass = "bg-emerald-500/15";
      textClass = "text-emerald-400";
      newNum = newLineNum++;
    } else if (!line.startsWith("\\")) {
      oldNum = oldLineNum++;
      newNum = newLineNum++;
    }

    const lineIssues = type !== "delete" && newNum !== "" ? issues.filter(i => i.lineNumber === newNum) : [];

    return (
      <React.Fragment key={index}>
        <div className={`flex font-mono text-sm group ${bgClass}`}>
          <div className="w-12 shrink-0 border-r border-white/5 text-right pr-2 text-neutral-600 select-none py-0.5 text-xs">{oldNum}</div>
          <div className="w-12 shrink-0 border-r border-white/5 text-right pr-2 text-neutral-600 select-none py-0.5 text-xs">{newNum}</div>
          <div className={`flex-1 pl-4 whitespace-pre-wrap py-0.5 ${textClass} break-all`}>
            {line.replace(/^[+-]/, " ")}
          </div>
        </div>
        {lineIssues.map(issue => (
          <div key={issue.id} className="flex border-y border-white/10 bg-neutral-900/50 my-1 ml-24 mr-4 rounded-md overflow-hidden shadow-lg shadow-black/50">
            <div className={`w-1 ${issue.severity === 'blocking' ? 'bg-red-500' : issue.severity === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`} />
            <div className="p-3 w-full">
              <div className="flex items-center gap-2 mb-1">
                {issue.severity === "blocking" && <AlertCircle className="w-4 h-4 text-red-500" />}
                {issue.severity === "high" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                {issue.severity === "suggestion" && <MessageSquare className="w-4 h-4 text-blue-500" />}
                <span className="font-semibold text-white">{issue.title}</span>
                <Badge variant="outline" className="ml-auto capitalize text-xs h-5 py-0 px-1.5">{issue.severity}</Badge>
              </div>
              <p className="text-sm text-neutral-300">{issue.description}</p>
              {issue.suggestion && (
                <div className="mt-2 text-sm bg-black/40 border border-white/5 text-neutral-200 p-2 rounded-md font-mono whitespace-pre-wrap">
                  <span className="text-neutral-500 text-xs block mb-1 uppercase tracking-wider">Suggested Fix</span>
                  {issue.suggestion}
                </div>
              )}
            </div>
          </div>
        ))}
      </React.Fragment>
    );
  });

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm shadow-2xl">
      <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <span className="font-medium text-sm text-white">{file.name || "Unknown file"}</span>
        {issues.length > 0 && (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
          </Badge>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-full inline-block align-middle">
          {renderedLines}
        </div>
      </div>
    </div>
  );
}
