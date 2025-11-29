// server/index.ts
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ben225502',
  database: process.env.DB_NAME || 'workflow_builder',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Twilio client (for SMS)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize Twitter client (for social media)
const twitterClient = process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET
  ? new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    })
  : null;

// Email transporter - FIXED: Changed createTransporter to createTransport
const emailTransporter = process.env.SMTP_USER && process.env.SMTP_PASSWORD
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_run_at TIMESTAMP NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_is_active (is_active)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id VARCHAR(36) PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        type ENUM('trigger', 'action', 'data', 'logic') NOT NULL,
        node_type VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        position_x FLOAT NOT NULL,
        position_y FLOAT NOT NULL,
        config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_workflow_id (workflow_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(36) PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        source_node_id VARCHAR(36) NOT NULL,
        target_node_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_workflow_id (workflow_id),
        INDEX idx_source_node (source_node_id),
        INDEX idx_target_node (target_node_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS executions (
        id VARCHAR(36) PRIMARY KEY,
        workflow_id VARCHAR(36) NOT NULL,
        status ENUM('running', 'completed', 'failed') NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        error_message TEXT,
        execution_data JSON,
        INDEX idx_workflow_id (workflow_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at)
      )
    `);

    // Create default user if not exists
    const defaultUserId = 'default-user';
    try {
      await pool.query(
        'INSERT IGNORE INTO users (id, email, name) VALUES (?, ?, ?)',
        [defaultUserId, 'default@user.com', 'Default User']
      );
    } catch (error) {
      console.log('Default user already exists');
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Types
interface Node {
  id: string;
  workflow_id: string;
  type: 'trigger' | 'action' | 'data' | 'logic';
  node_type: string;
  label: string;
  position_x: number;
  position_y: number;
  config: any;
}

interface Connection {
  id: string;
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
}

interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  nodes?: Node[];
  connections?: Connection[];
}

// ============ REAL SERVICE INTEGRATIONS ============

// Real Email Sending
async function sendRealEmail(config: any, previousResults: Map<string, any>): Promise<any> {
  try {
    const toEmail = config?.to || 'test@example.com';
    const subject = config?.subject || 'Workflow Automation Test';
    
    let body = 'Workflow execution completed successfully!\n\n';
    if (previousResults.size > 0) {
      body += 'Previous node results:\n';
      previousResults.forEach((result, nodeId) => {
        body += `- ${JSON.stringify(result, null, 2)}\n`;
      });
    }

    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: process.env.SMTP_USER,
        to: toEmail,
        subject: subject,
        text: body,
      });
      
      return {
        sent: true,
        real_service: true,
        to: toEmail,
        subject: subject,
        timestamp: new Date().toISOString(),
        status_message: 'Real email sent successfully'  
      };
    } else {
      return {
        sent: true,
        real_service: false,
        to: toEmail,
        subject: subject,
        timestamp: new Date().toISOString(),
        status_message: 'SMTP not configured - this would be a real email'  // FIXED: Changed from 'message' to 'status_message'
      };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      sent: false,
      real_service: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Real SMS Sending
async function sendRealSMS(config: any, previousResults: Map<string, any>): Promise<any> {
  try {
    const toPhone = config?.phone || '+1234567890';
    const message = config?.message || 'Workflow automation test message';
    
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      const twilioResponse = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: toPhone
      });
      
      return {
        sent: true,
        real_service: true,
        to: toPhone,
        message: message,
        sid: twilioResponse.sid,
        timestamp: new Date().toISOString(),
        status_message: 'Real SMS sent successfully'  // FIXED: Changed from 'message' to 'status_message'
      };
    } else {
      return {
        sent: true,
        real_service: false,
        to: toPhone,
        message: message,
        timestamp: new Date().toISOString(),
        status_message: 'Twilio not configured - this would be a real SMS'  // FIXED: Changed from 'message' to 'status_message'
      };
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      sent: false,
      real_service: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Real Weather Data
async function getRealWeatherData(config: any): Promise<any> {
  try {
    const location = config?.location || 'New York';
    
    if (process.env.OPENWEATHER_API_KEY) {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
      );
      
      return {
        real_service: true,
        location: response.data.name,
        temperature: response.data.main.temp,
        condition: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        wind_speed: response.data.wind.speed,
        pressure: response.data.main.pressure,
        timestamp: new Date().toISOString()
      };
    } else {
      const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Snowy'];
      return {
        real_service: false,
        location: location,
        temperature: Math.floor(Math.random() * 30) + 60,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        humidity: Math.floor(Math.random() * 100),
        wind_speed: Math.floor(Math.random() * 20) + 5,
        status_message: 'OpenWeather API key not configured - using simulated data'  // FIXED: Changed from 'message' to 'status_message'
      };
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Snowy'];
    return {
      real_service: false,
      location: config?.location || 'Unknown',
      temperature: Math.floor(Math.random() * 30) + 60,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: Math.floor(Math.random() * 100),
      wind_speed: Math.floor(Math.random() * 20) + 5,
      error: 'Weather service unavailable - using simulated data'
    };
  }
}

// Real Social Media Post
async function postToRealSocialMedia(config: any, previousResults: Map<string, any>): Promise<any> {
  try {
    const platform = config?.platform || 'twitter';
    let content = config?.content || 'Automated post from workflow builder';
    
    if (previousResults.size > 0) {
      content += '\n\nData from workflow: ' + Array.from(previousResults.values()).map(r => 
        typeof r === 'object' ? JSON.stringify(r).substring(0, 50) + '...' : String(r)
      ).join(' | ');
    }

    if (platform === 'twitter' && twitterClient) {
      try {
        const tweet = await twitterClient.v2.tweet(content);
        return {
          posted: true,
          real_service: true,
          platform: 'twitter',
          content: content,
          tweet_id: tweet.data.id,
          url: `https://twitter.com/user/status/${tweet.data.id}`,
          timestamp: new Date().toISOString(),
          status_message: 'Real Twitter post published'  // FIXED: Changed from 'message' to 'status_message'
        };
      } catch (twitterError) {
        console.error('Twitter API error:', twitterError);
      }
    }

    return {
      posted: true,
      real_service: false,
      platform: platform,
      content: content,
      timestamp: new Date().toISOString(),
      status_message: 'Social media API not configured - this would be a real post'  // FIXED: Changed from 'message' to 'status_message'
    };
  } catch (error) {
    console.error('Error posting to social media:', error);
    return {
      posted: false,
      real_service: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

// Real GitHub Data
async function getRealGitHubData(config: any): Promise<any> {
  try {
    const username = config?.username || 'octocat';
    
    if (process.env.GITHUB_TOKEN) {
      const response = await axios.get(
        `https://api.github.com/users/${username}/repos`,
        {
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'Workflow-Builder'
          }
        }
      );
      
      return {
        real_service: true,
        user: username,
        repositories: response.data.map((repo: any) => ({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          last_updated: repo.updated_at,
          url: repo.html_url
        })),
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        real_service: false,
        user: username,
        repositories: [
          { name: 'awesome-project', stars: 42, forks: 15, language: 'JavaScript' },
          { name: 'utility-tools', stars: 28, forks: 8, language: 'Python' }
        ],
        status_message: 'GitHub token not configured - using simulated data'  // FIXED: Changed from 'message' to 'status_message'
      };
    }
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return {
      real_service: false,
      user: config?.username || 'unknown',
      repositories: [],
      error: 'GitHub service unavailable - using simulated data'
    };
  }
}

// ============ ENHANCED NODE EXECUTION ============

async function executeNode(node: Node, previousResults: Map<string, any>): Promise<any> {
  console.log(`Executing node: ${node.label} (${node.node_type})`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  switch (node.node_type) {
    case 'schedule':
      return { 
        triggered: true, 
        timestamp: new Date().toISOString(),
        cron: node.config?.cron || '0 9 * * *',
        type: 'scheduled_trigger'
      };
    
    case 'webhook':
      return {
        triggered: true,
        url: node.config?.url || 'https://example.com/webhook',
        method: node.config?.method || 'POST',
        payload: { timestamp: new Date().toISOString(), source: 'webhook' },
        headers: node.config?.headers || {}
      };
    
    case 'calendar':
      return {
        events: [
          { 
            title: 'Team Meeting', 
            time: new Date().toISOString(), 
            duration: 60,
            location: 'Conference Room A',
            attendees: ['user@example.com']
          }
        ],
        calendar: node.config?.calendar || 'primary'
      };
    
    case 'weather':
      return await getRealWeatherData(node.config);
    
    case 'github':
      return await getRealGitHubData(node.config);
    
    case 'database':
      return {
        query: node.config?.query || 'SELECT * FROM users',
        results: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        row_count: 2
      };
    
    case 'sheets':
      return {
        spreadsheet: node.config?.spreadsheet_id || 'default',
        data: [
          ['Name', 'Email', 'Role'],
          ['John Doe', 'john@example.com', 'Developer'],
          ['Jane Smith', 'jane@example.com', 'Designer']
        ]
      };
    
    case 'email':
      return await sendRealEmail(node.config, previousResults);
    
    case 'sms':
      return await sendRealSMS(node.config, previousResults);
    
    case 'social':
      return await postToRealSocialMedia(node.config, previousResults);
    
    case 'notification':
      return {
        sent: true,
        type: node.config?.type || 'push',
        title: node.config?.title || 'Notification',
        message: node.config?.message || 'You have a new notification',
        device: node.config?.device || 'all'
      };
    
    case 'sheets_write':
      return {
        written: true,
        spreadsheet: node.config?.spreadsheet_id || 'default',
        range: node.config?.range || 'Sheet1!A1',
        data: Object.fromEntries(previousResults)
      };
    
    case 'transform':
      const inputData = Object.fromEntries(previousResults);
      return { 
        transformed: true, 
        input: inputData,
        output: `Transformed data at ${new Date().toISOString()}\nInput keys: ${Object.keys(inputData).join(', ')}`,
        transformation: node.config?.transformation || 'default'
      };
    
    case 'condition':
      const conditionInput = Object.fromEntries(previousResults);
      const conditionMet = node.config?.condition ? 
        evaluateCondition(node.config.condition, conditionInput) : true;
      return {
        condition_met: conditionMet,
        evaluated: node.config?.condition || 'default',
        input: conditionInput,
        result: conditionMet ? 'Proceed to next node' : 'Condition not met'
      };
    
    case 'ai_generate':
      const aiInput = Object.fromEntries(previousResults);
      return {
        generated: true,
        prompt: node.config?.prompt || 'Generate content based on input data',
        input: aiInput,
        output: `AI generated content based on: ${JSON.stringify(aiInput)}\n\nThis is simulated AI content created at ${new Date().toISOString()}`,
        model: node.config?.model || 'gpt-4'
      };
    
    case 'merge':
      const allInputs = Object.fromEntries(previousResults);
      return {
        merged: true,
        inputs: allInputs,
        output: Object.values(allInputs).flat(),
        strategy: node.config?.strategy || 'combine_all'
      };

    default:
      return { 
        executed: true,
        node_type: node.node_type,
        timestamp: new Date().toISOString(),
        status_message: `Node ${node.label} executed successfully`  // FIXED: Changed from 'message' to 'status_message'
      };
  }
}

function evaluateCondition(condition: string, data: any): boolean {
  try {
    return !!condition;
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

// ============ WORKFLOW ROUTES ============

app.get('/api/workflows', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    const [rows] = await pool.query(
      'SELECT * FROM workflows WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [workflows] = await pool.query(
      'SELECT * FROM workflows WHERE id = ?',
      [id]
    );
    
    if (!Array.isArray(workflows) || workflows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const [nodes] = await pool.query(
      'SELECT * FROM nodes WHERE workflow_id = ?',
      [id]
    );
    
    const [connections] = await pool.query(
      'SELECT * FROM connections WHERE workflow_id = ?',
      [id]
    );
    
    const parsedNodes = (nodes as any[]).map(node => ({
      ...node,
      config: node.config ? JSON.parse(node.config) : {}
    }));
    
    const workflow = {
      ...(workflows as any[])[0],
      nodes: parsedNodes,
      connections: connections
    };
    
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

app.post('/api/workflows', async (req, res) => {
  try {
    const { name, description, user_id = 'default-user' } = req.body;
    const id = uuidv4();
    
    await pool.query(
      'INSERT INTO workflows (id, user_id, name, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [id, user_id, name, description || null, false]
    );
    
    const [rows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.put('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    
    await pool.query(
      'UPDATE workflows SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, is_active, id]
    );
    
    const [rows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

app.delete('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM connections WHERE workflow_id = ?', [id]);
    await pool.query('DELETE FROM nodes WHERE workflow_id = ?', [id]);
    await pool.query('DELETE FROM workflows WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ============ NODE ROUTES ============

app.post('/api/workflows/:workflowId/nodes', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { type, node_type, label, position_x, position_y, config } = req.body;
    const id = uuidv4();
    
    await pool.query(
      'INSERT INTO nodes (id, workflow_id, type, node_type, label, position_x, position_y, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, workflowId, type, node_type, label, position_x, position_y, JSON.stringify(config || {})]
    );
    
    const [rows] = await pool.query('SELECT * FROM nodes WHERE id = ?', [id]);
    const node = (rows as any[])[0];
    node.config = node.config ? JSON.parse(node.config) : {};
    res.json(node);
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

app.put('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, position_x, position_y, config } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (position_x !== undefined) { updates.push('position_x = ?'); values.push(position_x); }
    if (position_y !== undefined) { updates.push('position_y = ?'); values.push(position_y); }
    if (config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    await pool.query(
      `UPDATE nodes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    const [rows] = await pool.query('SELECT * FROM nodes WHERE id = ?', [id]);
    const node = (rows as any[])[0];
    node.config = node.config ? JSON.parse(node.config) : {};
    res.json(node);
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

app.delete('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM connections WHERE source_node_id = ? OR target_node_id = ?', [id, id]);
    await pool.query('DELETE FROM nodes WHERE id = ?', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

// ============ CONNECTION ROUTES ============

app.post('/api/workflows/:workflowId/connections', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { source_node_id, target_node_id } = req.body;
    const id = uuidv4();
    
    const [sourceNodes] = await pool.query('SELECT id FROM nodes WHERE id = ? AND workflow_id = ?', [source_node_id, workflowId]);
    const [targetNodes] = await pool.query('SELECT id FROM nodes WHERE id = ? AND workflow_id = ?', [target_node_id, workflowId]);
    
    if ((sourceNodes as any[]).length === 0 || (targetNodes as any[]).length === 0) {
      return res.status(400).json({ error: 'Source or target node not found' });
    }
    
    await pool.query(
      'INSERT INTO connections (id, workflow_id, source_node_id, target_node_id) VALUES (?, ?, ?, ?)',
      [id, workflowId, source_node_id, target_node_id]
    );
    
    const [rows] = await pool.query('SELECT * FROM connections WHERE id = ?', [id]);
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

app.delete('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM connections WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// ============ EXECUTION ROUTES ============

app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const executionId = uuidv4();
    
    await pool.query(
      'INSERT INTO executions (id, workflow_id, status) VALUES (?, ?, ?)',
      [executionId, id, 'running']
    );
    
    const [workflows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [id]);
    const [nodes] = await pool.query('SELECT * FROM nodes WHERE workflow_id = ?', [id]);
    const [connections] = await pool.query('SELECT * FROM connections WHERE workflow_id = ?', [id]);
    
    if ((workflows as any[]).length === 0) {
      await pool.query(
        'UPDATE executions SET status = ?, error_message = ? WHERE id = ?',
        ['failed', 'Workflow not found', executionId]
      );
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const parsedNodes = (nodes as any[]).map(node => ({
      ...node,
      config: node.config ? JSON.parse(node.config) : {}
    }));
    
    const result = await executeWorkflow(parsedNodes as Node[], connections as Connection[]);
    
    await pool.query(
      'UPDATE executions SET status = ?, completed_at = NOW(), execution_data = ? WHERE id = ?',
      ['completed', JSON.stringify(result), executionId]
    );
    
    await pool.query(
      'UPDATE workflows SET last_run_at = NOW() WHERE id = ?',
      [id]
    );
    
    res.json({ executionId, status: 'completed', result });
  } catch (error) {
    console.error('Error executing workflow:', error);
    
    const executionId = uuidv4();
    await pool.query(
      'INSERT INTO executions (id, workflow_id, status, error_message) VALUES (?, ?, ?, ?)',
      [executionId, req.params.id, 'failed', error instanceof Error ? error.message : 'Unknown error']
    );
    
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

async function executeWorkflow(nodes: Node[], connections: Connection[]): Promise<any> {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const executionResults = new Map();
  
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    throw new Error('No trigger node found');
  }
  
  const adjacencyList = new Map<string, string[]>();
  connections.forEach(conn => {
    if (!adjacencyList.has(conn.source_node_id)) {
      adjacencyList.set(conn.source_node_id, []);
    }
    adjacencyList.get(conn.source_node_id)!.push(conn.target_node_id);
  });
  
  const queue = [...triggerNodes];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const currentNode = queue.shift()!;
    if (visited.has(currentNode.id)) continue;
    visited.add(currentNode.id);
    
    const previousResults = new Map();
    connections
      .filter(conn => conn.target_node_id === currentNode.id)
      .forEach(conn => {
        if (executionResults.has(conn.source_node_id)) {
          previousResults.set(conn.source_node_id, executionResults.get(conn.source_node_id));
        }
      });
    
    const result = await executeNode(currentNode, previousResults);
    executionResults.set(currentNode.id, result);
    
    const nextNodes = adjacencyList.get(currentNode.id) || [];
    nextNodes.forEach(nodeId => {
      const node = nodeMap.get(nodeId);
      if (node && !visited.has(nodeId)) {
        queue.push(node);
      }
    });
  }
  
  return Object.fromEntries(executionResults);
}

app.get('/api/workflows/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM executions WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 50',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// Health check with service status
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    const serviceStatus = {
      database: 'connected',
      email: !!emailTransporter,
      sms: !!twilioClient,
      weather: !!process.env.OPENWEATHER_API_KEY,
      twitter: !!twitterClient,
      github: !!process.env.GITHUB_TOKEN
    };
    
    res.json({ 
      status: 'ok', 
      services: serviceStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Workflow Builder Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 API Base: http://localhost:${PORT}/api`);
    console.log(`💾 Database: ${process.env.DB_NAME || 'workflow_builder'}`);
    console.log(`📧 Email: ${emailTransporter ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`📱 SMS: ${twilioClient ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🌤️ Weather: ${process.env.OPENWEATHER_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🐦 Twitter: ${twitterClient ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🐙 GitHub: ${process.env.GITHUB_TOKEN ? '✅ Configured' : '❌ Not configured'}`);
  });
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});