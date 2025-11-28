import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyzeStorage, type StorageAnalytics } from '../lib/storageAnalytics';
import { formatBytes } from '../lib/formatBytes';
import type { Folder } from '../AppTypes';

interface StorageAnalyticsDashboardProps {
  folder?: Folder;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'];

/**
 * Comprehensive Storage Analytics Dashboard
 * Shows file type distribution, category breakdown, largest files, and actionable recommendations
 */
export const StorageAnalyticsDashboard: React.FC<StorageAnalyticsDashboardProps> = ({ folder }) => {
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'largest' | 'recommendations'>('overview');

  useEffect(() => {
    if (folder) {
      const data = analyzeStorage(folder);
      setAnalytics(data);
    }
  }, [folder]);

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No data available. Scan a folder to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Files" value={analytics.totalFiles.toLocaleString()} />
        <StatCard label="Total Size" value={formatBytes(analytics.totalSize)} />
        <StatCard label="Average File Size" value={formatBytes(analytics.averageFileSize)} />
        <StatCard label="Recommendations" value={analytics.recommendations.length.toString()} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          📊 Overview
        </TabButton>
        <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
          📁 Categories
        </TabButton>
        <TabButton active={activeTab === 'largest'} onClick={() => setActiveTab('largest')}>
          📈 Largest Files
        </TabButton>
        <TabButton active={activeTab === 'recommendations'} onClick={() => setActiveTab('recommendations')}>
          💡 Recommendations
        </TabButton>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
        {activeTab === 'categories' && <CategoriesTab analytics={analytics} />}
        {activeTab === 'largest' && <LargestFilesTab analytics={analytics} />}
        {activeTab === 'recommendations' && <RecommendationsTab analytics={analytics} />}
      </div>
    </div>
  );
};

// Sub-components

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl font-bold text-blue-900">{value}</p>
  </div>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium transition-colors ${
      active
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const OverviewTab: React.FC<{ analytics: StorageAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* File Type Distribution Pie Chart */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top File Types by Size</h3>
        {analytics.fileTypes.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.fileTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type} (${percentage.toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalSize"
              >
                {analytics.fileTypes.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatBytes(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-10">No data</p>
        )}
      </div>

      {/* File Type Details */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">File Type Breakdown</h3>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {analytics.fileTypes.map((type, idx) => (
            <div key={type.type} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="font-medium text-sm truncate">{type.type}</span>
              </div>
              <div className="text-right ml-2">
                <p className="text-sm font-semibold text-gray-900">{formatBytes(type.totalSize)}</p>
                <p className="text-xs text-gray-500">{type.count} files</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const CategoriesTab: React.FC<{ analytics: StorageAnalytics }> = ({ analytics }) => (
  <div className="space-y-6">
    {/* Category Bar Chart */}
    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Storage by Category</h3>
      {analytics.categories.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={analytics.categories}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => formatBytes(value as number)} />
            <Legend />
            <Bar dataKey="size" fill="#10b981" name="Size" />
            <Bar dataKey="files" fill="#3b82f6" name="File Count" yAxisId="right" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-500 text-center py-10">No data</p>
      )}
    </div>

    {/* Category Details Table */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b-2 border-gray-300">
          <tr>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-right">Files</th>
            <th className="px-4 py-2 text-right">Size</th>
            <th className="px-4 py-2 text-right">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {analytics.categories.map((cat, idx) => (
            <tr key={cat.category} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-4 py-2 font-medium">{cat.category}</td>
              <td className="px-4 py-2 text-right text-gray-600">{cat.files.toLocaleString()}</td>
              <td className="px-4 py-2 text-right font-semibold">{formatBytes(cat.size)}</td>
              <td className="px-4 py-2 text-right text-gray-600">{cat.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const LargestFilesTab: React.FC<{ analytics: StorageAnalytics }> = ({ analytics }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Top 10 Largest Files</h3>
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {analytics.largestFiles.length > 0 ? (
        analytics.largestFiles.map((file, idx) => (
          <div key={file.id} className="p-4 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {idx + 1}. {file.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{file.extension}</p>
              </div>
              <p className="text-sm font-semibold text-blue-600 ml-4 flex-shrink-0">{formatBytes(file.size)}</p>
            </div>
            {/* Size progress bar */}
            <div className="w-full bg-gray-300 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${(file.size / analytics.largestFiles[0].size) * 100}%`,
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-10">No files to display</p>
      )}
    </div>
  </div>
);

const RecommendationsTab: React.FC<{ analytics: StorageAnalytics }> = ({ analytics }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Storage Optimization Recommendations</h3>
    {analytics.recommendations.length > 0 ? (
      <div className="space-y-3">
        {analytics.recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded border-l-4 ${
              rec.severity === 'high'
                ? 'bg-red-50 border-red-500'
                : rec.severity === 'medium'
                  ? 'bg-amber-50 border-amber-500'
                  : 'bg-blue-50 border-blue-500'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ml-4 flex-shrink-0 ${
                  rec.severity === 'high'
                    ? 'bg-red-200 text-red-800'
                    : rec.severity === 'medium'
                      ? 'bg-amber-200 text-amber-800'
                      : 'bg-blue-200 text-blue-800'
                }`}
              >
                {rec.severity}
              </span>
            </div>
            {rec.potentialSavings > 0 && (
              <p className="text-sm font-medium text-green-700">
                💾 Potential savings: {formatBytes(rec.potentialSavings)}
              </p>
            )}
            <button
              onClick={rec.action}
              className="mt-2 px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Learn More →
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 text-center py-10">No recommendations at this time</p>
    )}
  </div>
);
