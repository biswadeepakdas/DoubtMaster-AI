'use client';

import { useState, useEffect } from 'react';

/**
 * Admin Panel - Teacher/School Dashboard
 * Agent 7: Frontend Engineer
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 245,
    activeToday: 187,
    avgAccuracy: 78,
    totalSolved: 12450,
    topSubject: 'Mathematics',
    weakestTopic: 'Trigonometry',
  });

  const [students, setStudents] = useState([
    { id: 1, name: 'Aarav Sharma', class: '10-A', solved: 156, accuracy: 85, streak: 12, status: 'active' },
    { id: 2, name: 'Priya Patel', class: '10-A', solved: 203, accuracy: 92, streak: 21, status: 'active' },
    { id: 3, name: 'Rahul Kumar', class: '10-B', solved: 67, accuracy: 61, streak: 2, status: 'needs_attention' },
    { id: 4, name: 'Ananya Reddy', class: '10-A', solved: 189, accuracy: 88, streak: 15, status: 'active' },
    { id: 5, name: 'Vikram Singh', class: '10-B', solved: 45, accuracy: 55, streak: 0, status: 'inactive' },
  ]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, backgroundColor: '#1E293B', padding: '24px 16px' }}>
        <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>
          DoubtMaster School
        </div>
        {['Dashboard', 'Students', 'Analytics', 'Assignments', 'Reports', 'Settings'].map((item, i) => (
          <div key={item} style={{
            color: i === 0 ? '#FFFFFF' : '#94A3B8',
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 4,
            backgroundColor: i === 0 ? '#334155' : 'transparent',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            {item}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: 240, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B', margin: 0 }}>School Dashboard</h1>
            <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>Delhi Public School, Noida — Class 10</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
              Export Report
            </button>
            <button style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              + Add Student
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Students" value={stats.totalStudents} color="#6366F1" />
          <StatCard label="Active Today" value={stats.activeToday} color="#10B981" />
          <StatCard label="Avg Accuracy" value={`${stats.avgAccuracy}%`} color="#F59E0B" />
          <StatCard label="Questions Solved" value={stats.totalSolved.toLocaleString()} color="#3B82F6" />
        </div>

        {/* Alerts */}
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>Needs Attention</div>
          <div style={{ color: '#7F1D1D', fontSize: 14 }}>
            2 students have accuracy below 65% this week: Rahul Kumar (61%), Vikram Singh (55%).
            Consider assigning targeted practice.
          </div>
        </div>

        {/* Students Table */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', fontWeight: 600, fontSize: 16, color: '#1E293B' }}>
            Students
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                {['Name', 'Class', 'Solved', 'Accuracy', 'Streak', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1E293B' }}>{student.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B' }}>{student.class}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#1E293B', fontWeight: 600 }}>{student.solved}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: student.accuracy >= 80 ? '#059669' : student.accuracy >= 65 ? '#D97706' : '#DC2626',
                    }}>
                      {student.accuracy}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>
                    {student.streak > 0 ? `🔥 ${student.streak}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 12,
                      backgroundColor: student.status === 'active' ? '#D1FAE5' : student.status === 'needs_attention' ? '#FEF3C7' : '#F1F5F9',
                      color: student.status === 'active' ? '#065F46' : student.status === 'needs_attention' ? '#92400E' : '#64748B',
                    }}>
                      {student.status === 'active' ? 'Active' : student.status === 'needs_attention' ? 'Needs Help' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ fontSize: 13, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, border: '1px solid #E2E8F0' }}>
      <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginBottom: 12 }} />
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1E293B' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{label}</div>
    </div>
  );
}
