'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Play, Plus, Save, Trash2, Settings, X, Calendar, Mail, Cloud, Database, Zap, GitBranch, MessageSquare, Clock, Share2, FileText, History, AlertCircle, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

// Type definitions
interface NodeConfig {
  id: string;
  label: string;
  icon: any;
  color: string;
  description: string;
}

interface NodeTypes {
  trigger: NodeConfig[];
  data: NodeConfig[];
  logic: NodeConfig[];
  action: NodeConfig[];
}

interface Node {
  id: string;
  type: 'trigger' | 'action' | 'data' | 'logic';
  node_type: string;
  label: string;
  position_x: number;
  position_y: number;
  config: any;
}

interface Connection {
  id: string;
  source_node_id: string;
  target_node_id: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  nodes?: Node[];
  connections?: Connection[];
}

interface ConnectingState {
  sourceId: string;
  x: number;
  y: number;
}

interface ExecutionResult {
  executionId: string;
  status: string;
  result: any;
}

// Enhanced Node type definitions with descriptions
const NODE_TYPES: NodeTypes = {
  trigger: [
    { 
      id: 'schedule', 
      label: 'Schedule', 
      icon: Clock, 
      color: 'bg-purple-500',
      description: 'Trigger workflow at specific times using cron expressions'
    },
    { 
      id: 'webhook', 
      label: 'Webhook', 
      icon: Zap, 
      color: 'bg-purple-500',
      description: 'Trigger workflow via HTTP webhook calls'
    },
    { 
      id: 'calendar', 
      label: 'Calendar Event', 
      icon: Calendar, 
      color: 'bg-purple-500',
      description: 'Trigger when calendar events start or end'
    },
  ],
  data: [
    { 
      id: 'weather', 
      label: 'Weather API', 
      icon: Cloud, 
      color: 'bg-blue-500',
      description: 'Fetch current weather data for locations'
    },
    { 
      id: 'calendar_data', 
      label: 'Google Calendar', 
      icon: Calendar, 
      color: 'bg-blue-500',
      description: 'Read events from Google Calendar'
    },
    { 
      id: 'github', 
      label: 'GitHub', 
      icon: GitBranch, 
      color: 'bg-blue-500',
      description: 'Fetch repository data and activity'
    },
    { 
      id: 'database', 
      label: 'Database Query', 
      icon: Database, 
      color: 'bg-blue-500',
      description: 'Execute SQL queries and fetch data'
    },
    { 
      id: 'sheets', 
      label: 'Google Sheets', 
      icon: FileText, 
      color: 'bg-blue-500',
      description: 'Read data from Google Sheets'
    },
  ],
  logic: [
    { 
      id: 'transform', 
      label: 'Transform Data', 
      icon: GitBranch, 
      color: 'bg-yellow-500',
      description: 'Modify and transform data between nodes'
    },
    { 
      id: 'condition', 
      label: 'Condition', 
      icon: GitBranch, 
      color: 'bg-yellow-500',
      description: 'Add conditional logic and branching'
    },
    { 
      id: 'ai_generate', 
      label: 'AI Generate', 
      icon: Zap, 
      color: 'bg-yellow-500',
      description: 'Generate content using AI models'
    },
    { 
      id: 'merge', 
      label: 'Merge Data', 
      icon: GitBranch, 
      color: 'bg-yellow-500',
      description: 'Combine data from multiple sources'
    },
  ],
  action: [
    { 
      id: 'email', 
      label: 'Send Email', 
      icon: Mail, 
      color: 'bg-green-500',
      description: 'Send emails with dynamic content'
    },
    { 
      id: 'sms', 
      label: 'Send SMS', 
      icon: MessageSquare, 
      color: 'bg-green-500',
      description: 'Send text messages via SMS'
    },
    { 
      id: 'social', 
      label: 'Post to Social', 
      icon: Share2, 
      color: 'bg-green-500',
      description: 'Post to social media platforms'
    },
    { 
      id: 'notification', 
      label: 'Push Notification', 
      icon: MessageSquare, 
      color: 'bg-green-500',
      description: 'Send push notifications'
    },
    { 
      id: 'sheets_write', 
      label: 'Write to Sheet', 
      icon: FileText, 
      color: 'bg-green-500',
      description: 'Write data to Google Sheets'
    },
  ],
};

// Example workflows for quick start
const EXAMPLE_WORKFLOWS = [
  {
    name: "Daily Briefing",
    description: "Get weather, calendar events, and send daily summary via email",
    nodes: [
      { type: 'trigger', node_type: 'schedule', label: 'Morning Schedule', x: 100, y: 100 },
      { type: 'data', node_type: 'weather', label: 'Weather Check', x: 100, y: 250 },
      { type: 'data', node_type: 'calendar_data', label: 'Todays Events', x: 100, y: 400 },
      { type: 'logic', node_type: 'transform', label: 'Format Briefing', x: 300, y: 325 },
      { type: 'action', node_type: 'email', label: 'Send Email', x: 500, y: 325 }
    ]
  },
  {
    name: "Social Media Scheduler",
    description: "Generate AI content and post to social media",
    nodes: [
      { type: 'trigger', node_type: 'schedule', label: 'Post Schedule', x: 100, y: 100 },
      { type: 'logic', node_type: 'ai_generate', label: 'Generate Content', x: 100, y: 250 },
      { type: 'action', node_type: 'social', label: 'Post to Twitter', x: 300, y: 250 },
      { type: 'action', node_type: 'social', label: 'Post to LinkedIn', x: 300, y: 400 }
    ]
  },
  {
    name: "GitHub Digest",
    description: "Weekly summary of GitHub activity",
    nodes: [
      { type: 'trigger', node_type: 'schedule', label: 'Weekly Schedule', x: 100, y: 100 },
      { type: 'data', node_type: 'github', label: 'GitHub Activity', x: 100, y: 250 },
      { type: 'logic', node_type: 'transform', label: 'Format Digest', x: 300, y: 250 },
      { type: 'action', node_type: 'email', label: 'Send Digest', x: 500, y: 250 }
    ]
  }
];

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showExecutionResults, setShowExecutionResults] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/workflows?userId=default-user`);
      const data = await response.json();
      
      let workflowsData: Workflow[] = [];
      if (Array.isArray(data)) {
        workflowsData = data;
      } else {
        console.warn('Unexpected API response structure:', data);
        workflowsData = [];
      }

      const validWorkflows = workflowsData
        .filter(workflow => workflow && workflow.id)
        .map((workflow, index) => ({
          ...workflow,
          id: workflow.id || `workflow-${index}-${Date.now()}`
        }));

      setWorkflows(validWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      setWorkflows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createWorkflow = async (name?: string, example?: any) => {
    const workflowName = name || prompt('Enter workflow name:');
    if (!workflowName) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: workflowName, 
          description: example?.description,
          user_id: 'default-user' 
        }),
      });
      const workflow = await response.json();
      setWorkflows(prev => [...prev, workflow]);
      
      if (example && example.nodes) {
        for (const nodeDef of example.nodes) {
          await addNode(nodeDef.type as keyof NodeTypes, nodeDef.node_type, { x: nodeDef.x, y: nodeDef.y }, workflow.id);
        }
      }
      
      await loadWorkflow(workflow.id);
      setShowExamples(false);
    } catch (error) {
      console.error('Error creating workflow:', error);
      alert('Error creating workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/workflows/${id}`);
      const workflow = await response.json();
      
      const validatedNodes = (workflow.nodes || []).map((node: any, index: number) => ({
        ...node,
        id: node.id || `node-${index}-${Date.now()}`,
        type: node.type || 'action',
        node_type: node.node_type || node.type || 'unknown',
        label: node.label || 'Unnamed Node',
        position_x: node.position_x || 0,
        position_y: node.position_y || 0,
        config: node.config || {}
      }));

      setCurrentWorkflow(workflow);
      setNodes(validatedNodes);
      setConnections(workflow.connections || []);
    } catch (error) {
      console.error('Error loading workflow:', error);
      alert('Error loading workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkflow = async () => {
    if (!currentWorkflow) return;
    
    try {
      setIsLoading(true);
      await fetch(`${API_URL}/workflows/${currentWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentWorkflow.name,
          description: currentWorkflow.description,
          is_active: currentWorkflow.is_active
        }),
      });
      alert('Workflow saved successfully!');
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWorkflow = async () => {
    if (!currentWorkflow || !confirm('Are you sure you want to delete this workflow?')) return;

    try {
      setIsLoading(true);
      await fetch(`${API_URL}/workflows/${currentWorkflow.id}`, { method: 'DELETE' });
      setWorkflows(prev => prev.filter(w => w.id !== currentWorkflow.id));
      setCurrentWorkflow(null);
      setNodes([]);
      setConnections([]);
      alert('Workflow deleted successfully!');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Error deleting workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const addNode = async (type: keyof NodeTypes, nodeType: string, position: { x: number; y: number } | null = null, workflowId?: string) => {
    const targetWorkflowId = workflowId || currentWorkflow?.id;
    if (!targetWorkflowId) {
      alert('Please create or select a workflow first');
      return;
    }

    const nodeConfig = Object.values(NODE_TYPES).flat().find(n => n.id === nodeType);
    if (!nodeConfig) return;
    
    const pos = position || { x: 100 - canvasOffset.x, y: 100 - canvasOffset.y };

    try {
      const response = await fetch(`${API_URL}/workflows/${targetWorkflowId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          node_type: nodeType,
          label: nodeConfig.label,
          position_x: pos.x,
          position_y: pos.y,
          config: {},
        }),
      });
      const node = await response.json();
      
      const nodeWithId = {
        ...node,
        id: node.id || `node-${nodes.length}-${Date.now()}`
      };
      
      if (!workflowId) {
        setNodes(prev => [...prev, nodeWithId]);
        setShowNodeMenu(false);
      }
      return nodeWithId;
    } catch (error) {
      console.error('Error adding node:', error);
      alert('Error adding node');
    }
  };

  const updateNodePosition = async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`${API_URL}/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: x, position_y: y }),
      });
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, position_x: x, position_y: y } : n));
    } catch (error) {
      console.error('Error updating node position:', error);
    }
  };

  const updateNodeConfig = async (nodeId: string, config: any) => {
    try {
      setIsLoading(true);
      await fetch(`${API_URL}/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config } : n));
    } catch (error) {
      console.error('Error updating node config:', error);
      alert('Error updating node configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNode = async (nodeId: string) => {
    try {
      setIsLoading(true);
      await fetch(`${API_URL}/nodes/${nodeId}`, { method: 'DELETE' });
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setConnections(prev => prev.filter(c => c.source_node_id !== nodeId && c.target_node_id !== nodeId));
      setSelectedNode(null);
    } catch (error) {
      console.error('Error deleting node:', error);
      alert('Error deleting node');
    } finally {
      setIsLoading(false);
    }
  };

  const startConnection = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setConnecting({ sourceId: nodeId, x: event.clientX, y: event.clientY });
  };

  const completeConnection = async (targetId: string) => {
    if (!connecting || connecting.sourceId === targetId || !currentWorkflow) return;

    const exists = connections.find(
      c => c.source_node_id === connecting.sourceId && c.target_node_id === targetId
    );
    if (exists) {
      setConnecting(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/workflows/${currentWorkflow.id}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_node_id: connecting.sourceId,
          target_node_id: targetId,
        }),
      });
      const connection = await response.json();
      setConnections(prev => [...prev, connection]);
    } catch (error) {
      console.error('Error creating connection:', error);
      alert('Error creating connection');
    } finally {
      setIsLoading(false);
      setConnecting(null);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      setIsLoading(true);
      await fetch(`${API_URL}/connections/${connectionId}`, { method: 'DELETE' });
      setConnections(prev => prev.filter(c => c.id !== connectionId));
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Error deleting connection');
    } finally {
      setIsLoading(false);
    }
  };

  const executeWorkflow = async () => {
    if (!currentWorkflow) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/workflows/${currentWorkflow.id}/execute`, {
        method: 'POST',
      });
      const result = await response.json();
      setExecutionResult(result);
      setShowExecutionResults(true);
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Error executing workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
    if (connecting) {
      setConnecting({ ...connecting, x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    if (connecting) {
      setConnecting(null);
    }
  };

  const getNodeConfig = (nodeType: string): NodeConfig => {
    if (!nodeType) {
      return { id: 'unknown', label: 'Unknown Node', icon: Zap, color: 'bg-gray-500', description: 'Unknown node type' };
    }
    
    for (const category in NODE_TYPES) {
      const found = NODE_TYPES[category as keyof NodeTypes].find(n => n.id === nodeType);
      if (found) return found;
    }
    return { id: nodeType, label: nodeType, icon: Zap, color: 'bg-gray-500', description: 'Custom node type' };
  };

  const renderConnections = () => {
    const validConnections = connections.filter(conn => {
      const source = nodes.find(n => n.id === conn.source_node_id);
      const target = nodes.find(n => n.id === conn.target_node_id);
      return source && target;
    });

    return validConnections.map(conn => {
      const source = nodes.find(n => n.id === conn.source_node_id)!;
      const target = nodes.find(n => n.id === conn.target_node_id)!;

      const x1 = source.position_x + canvasOffset.x + 150;
      const y1 = source.position_y + canvasOffset.y + 30;
      const x2 = target.position_x + canvasOffset.x;
      const y2 = target.position_y + canvasOffset.y + 30;

      const midX = (x1 + x2) / 2;

      return (
        <g key={conn.id}>
          <path
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            stroke="#6366f1"
            strokeWidth="2"
            fill="none"
            style={{ cursor: 'pointer' }}
            onMouseOver={(e) => e.currentTarget.style.stroke = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.stroke = '#6366f1'}
            onClick={() => deleteConnection(conn.id)}
          />
          <circle cx={x1} cy={y1} r="4" fill="#6366f1" />
          <circle cx={x2} cy={y2} r="4" fill="#6366f1" />
        </g>
      );
    });
  };

  // Inline styles
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#111827',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    sidebar: {
      width: '16rem',
      backgroundColor: '#1f2937',
      borderRight: '1px solid #374151',
      display: 'flex',
      flexDirection: 'column' as const
    },
    sidebarHeader: {
      padding: '1rem',
      borderBottom: '1px solid #374151'
    },
    sidebarContent: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '0.5rem'
    },
    workflowItem: {
      padding: '0.75rem',
      marginBottom: '0.5rem',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    button: {
      width: '100%',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    canvas: {
      flex: 1,
      position: 'relative' as const,
      overflow: 'hidden',
      backgroundColor: '#111827'
    },
    node: {
      position: 'absolute' as const,
      width: '10rem',
      backgroundColor: '#1f2937',
      border: '2px solid',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      cursor: 'move',
      transition: 'all 0.2s',
      zIndex: 10
    },
    nodeHeader: {
      padding: '0.5rem',
      borderTopLeftRadius: '0.5rem',
      borderTopRightRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    nodeType: {
      padding: '0.5rem',
      fontSize: '0.75rem',
      color: '#9ca3af'
    },
    connectionDot: {
      width: '1rem',
      height: '1rem',
      backgroundColor: '#6366f1',
      borderRadius: '50%',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      border: '2px solid #1f2937'
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    },
    modalContent: {
      backgroundColor: '#1f2937',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      maxWidth: '32rem',
      width: '100%',
      margin: '0 1rem',
      maxHeight: '80vh',
      overflowY: 'auto' as const
    },
    input: {
      width: '100%',
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '0.375rem',
      padding: '0.5rem 0.75rem',
      color: 'white',
      outline: 'none'
    },
    loadingSpinner: {
      animation: 'spin 1s linear infinite',
      border: '2px solid transparent',
      borderTop: '2px solid #6366f1',
      borderRadius: '50%',
      width: '2rem',
      height: '2rem'
    },
    exampleCard: {
      backgroundColor: '#374151',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Workflows</h1>
          <button
            onClick={() => setShowExamples(true)}
            disabled={isLoading}
            style={{
              ...styles.button,
              backgroundColor: '#059669',
              marginBottom: '0.5rem',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#047857')}
            onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#059669')}
          >
            <Plus size={16} />
            Use Template
          </button>
          <button
            onClick={() => createWorkflow()}
            disabled={isLoading}
            style={{
              ...styles.button,
              backgroundColor: isLoading ? '#4f46e5' : '#4f46e5',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#4338ca')}
            onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#4f46e5')}
          >
            <Plus size={16} />
            New Workflow
          </button>
        </div>

        <div style={styles.sidebarContent}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>Loading...</div>
          ) : workflows.length > 0 ? (
            workflows.map((workflow, index) => {
              const workflowKey = workflow.id || `workflow-${index}`;
              return (
                <div
                  key={workflowKey}
                  onClick={() => loadWorkflow(workflow.id)}
                  style={{
                    ...styles.workflowItem,
                    backgroundColor: currentWorkflow?.id === workflow.id ? '#4f46e5' : '#374151'
                  }}
                  onMouseOver={(e) => {
                    if (currentWorkflow?.id !== workflow.id) {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentWorkflow?.id !== workflow.id) {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {workflow.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {workflow.is_active ? '● Active' : '○ Inactive'}
                  </div>
                  {workflow.description && (
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {workflow.description}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>
              No workflows found. Create one to get started.
            </div>
          )}
        </div>

        {currentWorkflow && (
          <div style={{ padding: '1rem', borderTop: '1px solid #374151', gap: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Workflow Actions</div>
            <button
              onClick={() => setShowNodeMenu(true)}
              disabled={isLoading}
              style={{
                ...styles.button,
                backgroundColor: isLoading ? '#16a34a' : '#16a34a',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#15803d')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#16a34a')}
            >
              <Plus size={16} />
              Add Node
            </button>
            <button
              onClick={executeWorkflow}
              disabled={isLoading}
              style={{
                ...styles.button,
                backgroundColor: isLoading ? '#9333ea' : '#9333ea',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#7c3aed')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#9333ea')}
            >
              <Play size={16} />
              Execute
            </button>
            <button
              onClick={saveWorkflow}
              disabled={isLoading}
              style={{
                ...styles.button,
                backgroundColor: isLoading ? '#2563eb' : '#2563eb',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
            >
              <Save size={16} />
              Save
            </button>
            <button
              onClick={deleteWorkflow}
              disabled={isLoading}
              style={{
                ...styles.button,
                backgroundColor: isLoading ? '#dc2626' : '#dc2626',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#b91c1c')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#dc2626')}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div style={styles.canvas}>
        {currentWorkflow ? (
          <div
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              cursor: isPanning ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#374151" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <g style={{ pointerEvents: 'auto' }}>
                {renderConnections()}
                {connecting && nodes.find(n => n.id === connecting.sourceId) && (
                  <line
                    key="connecting-line"
                    x1={nodes.find(n => n.id === connecting.sourceId)!.position_x + canvasOffset.x + 150}
                    y1={nodes.find(n => n.id === connecting.sourceId)!.position_y + canvasOffset.y + 30}
                    x2={connecting.x}
                    y2={connecting.y}
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )}
              </g>
            </svg>

            {nodes.map((node, index) => {
              if (!node) return null;
              
              const nodeKey = node.id || `node-${index}-${Date.now()}`;
              const config = getNodeConfig(node.node_type);
              const Icon = config.icon;

              return (
                <div
                  key={nodeKey}
                  style={{
                    ...styles.node,
                    left: (node.position_x || 0) + canvasOffset.x,
                    top: (node.position_y || 0) + canvasOffset.y,
                    borderColor: selectedNode?.id === nodeKey ? '#6366f1' : '#4b5563'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    setDraggingNode(nodeKey);
                    setOffset({
                      x: e.clientX - (node.position_x || 0) - canvasOffset.x,
                      y: e.clientY - (node.position_y || 0) - canvasOffset.y,
                    });
                  }}
                  onMouseMove={(e) => {
                    if (draggingNode === nodeKey) {
                      const newX = e.clientX - offset.x - canvasOffset.x;
                      const newY = e.clientY - offset.y - canvasOffset.y;
                      setNodes(prev => prev.map(n => {
                        const nKey = n.id || `node-${nodes.indexOf(n)}`;
                        return nKey === nodeKey ? { ...n, position_x: newX, position_y: newY } : n;
                      }));
                    }
                  }}
                  onMouseUp={() => {
                    if (draggingNode === nodeKey) {
                      updateNodePosition(nodeKey, node.position_x, node.position_y);
                      setDraggingNode(null);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connecting) {
                      completeConnection(nodeKey);
                    }
                  }}
                >
                  <div 
                    style={{
                      ...styles.nodeHeader,
                      backgroundColor: config.color.includes('purple') ? '#8b5cf6' : 
                                     config.color.includes('blue') ? '#3b82f6' : 
                                     config.color.includes('yellow') ? '#eab308' : 
                                     config.color.includes('green') ? '#22c55e' : '#6b7280'
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {node.label || 'Unnamed Node'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                        setShowConfig(true);
                      }}
                      style={{
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                  <div style={styles.nodeType}>
                    {(node.type || 'node')?.toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', right: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <button
                      onClick={(e) => startConnection(nodeKey, e)}
                      style={styles.connectionDot}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#818cf8'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                    />
                  </div>
                  <div style={{ position: 'absolute', left: '-0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <div
                      style={{
                        ...styles.connectionDot,
                        backgroundColor: '#10b981'
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Canvas Instructions */}
            {nodes.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#6b7280',
                maxWidth: '400px'
              }}>
                <Zap size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Build Your Workflow</h3>
                <p style={{ marginBottom: '1rem' }}>Click "Add Node" to start building your automation workflow</p>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  <div>• Drag nodes to reposition them</div>
                  <div>• Click the blue dot to create connections</div>
                  <div>• Click on nodes to configure them</div>
                  <div>• Click "Execute" to test your workflow</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <Zap size={64} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Visual Workflow Builder</h2>
              <p style={{ marginBottom: '2rem', lineHeight: '1.5' }}>
                Create automation workflows with triggers, data sources, logic blocks, and actions. 
                Drag and drop nodes to build your flow and connect them to create powerful automations.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowExamples(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                >
                  Use Template
                </button>
                <button
                  onClick={() => createWorkflow()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                >
                  Create Blank Workflow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Node Menu Modal */}
      {showNodeMenu && (
        <div 
          style={styles.modalOverlay}
          onClick={() => setShowNodeMenu(false)}
        >
          <div 
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Add Node</h2>
              <button
                onClick={() => setShowNodeMenu(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            {Object.entries(NODE_TYPES).map(([category, types]) => (
              <div key={category} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                  {category}s
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {types.map((type: NodeConfig) => {
                    const Icon = type.icon;
                    const backgroundColor = type.color.includes('purple') ? '#8b5cf6' : 
                                          type.color.includes('blue') ? '#3b82f6' : 
                                          type.color.includes('yellow') ? '#eab308' : 
                                          type.color.includes('green') ? '#22c55e' : '#6b7280';
                    
                    return (
                      <button
                        key={type.id}
                        onClick={() => addNode(category as keyof NodeTypes, type.id)}
                        disabled={isLoading}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          textAlign: 'left' as const,
                          backgroundColor,
                          border: 'none',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e) => !isLoading && (e.currentTarget.style.opacity = '0.9')}
                        onMouseOut={(e) => !isLoading && (e.currentTarget.style.opacity = '1')}
                      >
                        <Icon size={24} />
                        <div>
                          <div style={{ fontWeight: '500' }}>{type.label}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{type.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples Modal */}
      {showExamples && (
        <div 
          style={styles.modalOverlay}
          onClick={() => setShowExamples(false)}
        >
          <div 
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Example Workflows</h2>
              <button
                onClick={() => setShowExamples(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ marginBottom: '1.5rem', color: '#9ca3af' }}>
              Start with these pre-built workflow templates
            </p>

            {EXAMPLE_WORKFLOWS.map((example, index) => (
              <div
                key={index}
                style={styles.exampleCard}
                onClick={() => createWorkflow(example.name, example)}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
              >
                <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{example.name}</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  {example.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Includes: {example.nodes.map(n => n.label).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Panel */}
      {showConfig && selectedNode && (
        <div 
          style={styles.modalOverlay}
          onClick={() => setShowConfig(false)}
        >
          <div 
            style={{
              ...styles.modalContent,
              maxWidth: '28rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Configure Node</h2>
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Node Label
                </label>
                <input
                  type="text"
                  value={selectedNode.label || ''}
                  onChange={(e) => {
                    setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n));
                  }}
                  style={styles.input}
                />
              </div>

              {selectedNode.node_type === 'email' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      To Email
                    </label>
                    <input
                      type="email"
                      value={selectedNode.config?.to || ''}
                      onChange={(e) => {
                        const config = { ...selectedNode.config, to: e.target.value };
                        setSelectedNode({ ...selectedNode, config });
                      }}
                      placeholder="recipient@example.com"
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config?.subject || ''}
                      onChange={(e) => {
                        const config = { ...selectedNode.config, subject: e.target.value };
                        setSelectedNode({ ...selectedNode, config });
                      }}
                      placeholder="Email subject"
                      style={styles.input}
                    />
                  </div>
                </>
              )}

              {selectedNode.node_type === 'schedule' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    value={selectedNode.config?.cron || '0 9 * * *'}
                    onChange={(e) => {
                      const config = { ...selectedNode.config, cron: e.target.value };
                      setSelectedNode({ ...selectedNode, config });
                    }}
                    placeholder="0 9 * * * (9 AM daily)"
                    style={styles.input}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    Examples: 0 9 * * * (9 AM daily), */5 * * * * (every 5 minutes)
                  </div>
                </div>
              )}

              {selectedNode.node_type === 'weather' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={selectedNode.config?.location || ''}
                    onChange={(e) => {
                      const config = { ...selectedNode.config, location: e.target.value };
                      setSelectedNode({ ...selectedNode, config });
                    }}
                    placeholder="New York, US"
                    style={styles.input}
                  />
                </div>
              )}

              {selectedNode.node_type === 'github' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    GitHub Username
                  </label>
                  <input
                    type="text"
                    value={selectedNode.config?.username || ''}
                    onChange={(e) => {
                      const config = { ...selectedNode.config, username: e.target.value };
                      setSelectedNode({ ...selectedNode, config });
                    }}
                    placeholder="octocat"
                    style={styles.input}
                  />
                </div>
              )}

              {selectedNode.node_type === 'ai_generate' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    AI Prompt
                  </label>
                  <textarea
                    value={selectedNode.config?.prompt || ''}
                    onChange={(e) => {
                      const config = { ...selectedNode.config, prompt: e.target.value };
                      setSelectedNode({ ...selectedNode, config });
                    }}
                    placeholder="Generate content based on the input data..."
                    style={{
                      ...styles.input,
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem' }}>
                <button
                  onClick={() => {
                    updateNodeConfig(selectedNode.id, selectedNode.config);
                    setShowConfig(false);
                  }}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    backgroundColor: isLoading ? '#4f46e5' : '#4f46e5',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#4338ca')}
                  onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#4f46e5')}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    deleteNode(selectedNode.id);
                    setShowConfig(false);
                  }}
                  disabled={isLoading}
                  style={{
                    backgroundColor: isLoading ? '#dc2626' : '#dc2626',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#b91c1c')}
                  onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#dc2626')}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results Modal */}
      {showExecutionResults && executionResult && (
        <div 
          style={styles.modalOverlay}
          onClick={() => setShowExecutionResults(false)}
        >
          <div 
            style={{
              ...styles.modalContent,
              maxWidth: '48rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Execution Results</h2>
              <button
                onClick={() => setShowExecutionResults(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ 
              backgroundColor: '#374151', 
              padding: '1rem', 
              borderRadius: '0.375rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={16} color="#10b981" />
                <span style={{ fontWeight: '500' }}>Workflow executed successfully!</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                Execution ID: {executionResult.executionId}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Node Results</h3>
              <div style={{ 
                backgroundColor: '#111827', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                maxHeight: '300px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}>
                <pre>{JSON.stringify(executionResult.result, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div style={styles.modalOverlay}>
          <div style={{ 
            backgroundColor: '#1f2937', 
            borderRadius: '0.5rem', 
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={styles.loadingSpinner} />
            <p style={{ color: '#d1d5db' }}>Processing...</p>
          </div>
        </div>
      )}

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}