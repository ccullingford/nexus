import React, { useState } from 'react';
import { ArrowLeft, Send, ShieldCheck, Mail, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { sendEmailViaGraph, generateInvoicePdf } from '@/components/api/functions';

export default function InvoiceManagerAdmin() {
  const [testEmail, setTestEmail] = useState({
    to: '',
    cc: '',
    subject: 'Test Email from Invoice Manager',
    message: 'This is a test email from the Invoice Manager admin panel.'
  });
  const [sending, setSending] = useState(false);
  
  // Contract test state
  const [testResults, setTestResults] = useState({
    emailTest: null,
    pdfTest: null
  });
  const [runningTests, setRunningTests] = useState(false);

  // Mock user data (in real app, this would come from useAuth())
  const user = {
    id: 'cm',
    name: 'Chris Cullingford',
    email: 'cm@cullingford.net',
    roles: ['super_admin'],
    permissions: ['invoice-manager:access', 'invoice-manager:write', 'hoa-manager:access']
  };

  const hasPermission = (permission) => {
    return user.permissions.includes(permission);
  };

  const runContractTests = async () => {
    setRunningTests(true);
    const results = { emailTest: null, pdfTest: null };

    // Test 1: sendEmailViaGraph
    try {
      console.log('=== Testing sendEmailViaGraph contract ===');
      const emailPayload = {
        to: ['test@example.com'],
        cc: ['cc@example.com'],
        subject: 'Contract Test Email',
        htmlBody: '<p>This is a contract test</p>',
        attachments: [
          {
            fileName: 'test.txt',
            contentType: 'text/plain',
            contentBytes: btoa('test content')
          }
        ]
      };

      const emailResult = await sendEmailViaGraph(emailPayload);
      
      // Verify response shape
      const hasSuccess = typeof emailResult.data?.success === 'boolean';
      const hasErrorOnFailure = !emailResult.data?.success ? typeof emailResult.data?.error === 'string' : true;
      
      results.emailTest = {
        passed: hasSuccess && hasErrorOnFailure,
        response: emailResult.data,
        checks: {
          hasSuccessField: hasSuccess,
          hasErrorOnFailure: hasErrorOnFailure
        }
      };
    } catch (error) {
      results.emailTest = {
        passed: false,
        error: error.message,
        response: null
      };
    }

    // Test 2: generateInvoicePdf
    try {
      console.log('=== Testing generateInvoicePdf contract ===');
      const mockInvoice = {
        invoice_number: 'TEST-001',
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        issue_date: '2025-01-01',
        due_date: '2025-01-31',
        line_items: [
          {
            description: 'Test Item',
            quantity: 1,
            price: 100,
            amount: 100
          }
        ],
        subtotal: 100,
        tax: 10,
        total: 110
      };

      const pdfResult = await generateInvoicePdf({ invoice: mockInvoice });
      
      // Verify response shape
      const hasSuccess = typeof pdfResult.data?.success === 'boolean';
      const hasPdfBase64 = pdfResult.data?.success ? typeof pdfResult.data?.pdfBase64 === 'string' : true;
      const hasFileName = pdfResult.data?.success ? typeof pdfResult.data?.fileName === 'string' : true;
      const hasErrorOnFailure = !pdfResult.data?.success ? typeof pdfResult.data?.error === 'string' : true;
      
      results.pdfTest = {
        passed: hasSuccess && hasPdfBase64 && hasFileName && hasErrorOnFailure,
        response: pdfResult.data,
        checks: {
          hasSuccessField: hasSuccess,
          hasPdfBase64OnSuccess: hasPdfBase64,
          hasFileNameOnSuccess: hasFileName,
          hasErrorOnFailure: hasErrorOnFailure
        }
      };
    } catch (error) {
      results.pdfTest = {
        passed: false,
        error: error.message,
        response: null
      };
    }

    setTestResults(results);
    setRunningTests(false);
    console.log('=== Contract tests completed ===', results);
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    
    if (!testEmail.to) {
      alert('Please enter a recipient email address');
      return;
    }

    setSending(true);

    try {
      console.log('=== Starting test email send ===');
      console.log('Recipient:', testEmail.to);
      console.log('CC:', testEmail.cc || '(none)');
      console.log('Subject:', testEmail.subject);
      console.log('Timestamp:', new Date().toISOString());

      const emailPayload = {
        to: [testEmail.to],
        cc: testEmail.cc ? [testEmail.cc] : undefined,
        subject: testEmail.subject,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #414257; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Test Email</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e3e4ed; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #414257; line-height: 1.6;">${testEmail.message}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e3e4ed;" />
              <p style="color: #5c5f7a; font-size: 14px;">
                Sent from Invoice Manager Admin Panel<br/>
                ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        `
      };

      console.log('Calling sendEmailViaGraph function...');
      console.log('Payload:', JSON.stringify({
        ...emailPayload,
        htmlBody: '(HTML content omitted from log)'
      }, null, 2));

      const result = await sendEmailViaGraph(emailPayload);

      console.log('Function result:', JSON.stringify(result, null, 2));

      if (!result.data.success) {
        throw new Error(result.data.error || 'Unknown error from sendEmailViaGraph');
      }

      console.log('=== Email sent successfully ===');
      alert('Test email sent successfully via Microsoft Graph!');
      
      // Reset form
      setTestEmail({
        ...testEmail,
        to: '',
        cc: ''
      });
    } catch (error) {
      console.error('=== Error sending test email ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      alert('Failed to send test email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#414257]">Admin Tools</h1>
          <p className="text-[#5c5f7a] mt-1">System testing and configuration</p>
        </div>
      </div>

      {/* Graph Email Test */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-[#414257]">Microsoft Graph Email Test</CardTitle>
              <CardDescription>Send a test email to verify the integration is working</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendTestEmail} className="space-y-4">
            <div>
              <Label>To Email *</Label>
              <Input
                type="email"
                value={testEmail.to}
                onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                placeholder="recipient@example.com"
                required
              />
            </div>

            <div>
              <Label>CC Email (optional)</Label>
              <Input
                type="email"
                value={testEmail.cc}
                onChange={(e) => setTestEmail({ ...testEmail, cc: e.target.value })}
                placeholder="cc@example.com"
              />
              <p className="text-xs text-[#5c5f7a] mt-1">Leave blank to skip CC</p>
            </div>

            <div>
              <Label>Subject *</Label>
              <Input
                value={testEmail.subject}
                onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                placeholder="Test email subject"
                required
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={testEmail.message}
                onChange={(e) => setTestEmail({ ...testEmail, message: e.target.value })}
                placeholder="Test message content..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="bg-[#414257] hover:bg-[#5c5f7a]"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Function Contract Tests */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <TestTube className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-[#414257]">Function Contract Tests</CardTitle>
              <CardDescription>Verify backend function payload and response formats</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              These tests verify that backend functions <code className="bg-blue-100 px-1 rounded">sendEmailViaGraph</code> and <code className="bg-blue-100 px-1 rounded">generateInvoicePdf</code> return the expected response format.
            </p>
          </div>

          <Button
            onClick={runContractTests}
            disabled={runningTests}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {runningTests ? 'Running Tests...' : 'Run Contract Tests'}
          </Button>

          {/* Test Results */}
          {(testResults.emailTest || testResults.pdfTest) && (
            <div className="space-y-4 mt-6">
              {/* Email Test Result */}
              {testResults.emailTest && (
                <div className={`p-4 rounded-lg border ${
                  testResults.emailTest.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.emailTest.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h4 className="font-semibold text-[#414257]">sendEmailViaGraph</h4>
                  </div>
                  {testResults.emailTest.error ? (
                    <p className="text-sm text-red-800">Error: {testResults.emailTest.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has success field:</span>
                          <Badge className={testResults.emailTest.checks.hasSuccessField ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.emailTest.checks.hasSuccessField ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has error on failure:</span>
                          <Badge className={testResults.emailTest.checks.hasErrorOnFailure ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.emailTest.checks.hasErrorOnFailure ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                      </div>
                      <details className="mt-2">
                        <summary className="text-sm text-[#5c5f7a] cursor-pointer">View Response</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                          {JSON.stringify(testResults.emailTest.response, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}

              {/* PDF Test Result */}
              {testResults.pdfTest && (
                <div className={`p-4 rounded-lg border ${
                  testResults.pdfTest.passed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResults.pdfTest.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h4 className="font-semibold text-[#414257]">generateInvoicePdf</h4>
                  </div>
                  {testResults.pdfTest.error ? (
                    <p className="text-sm text-red-800">Error: {testResults.pdfTest.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has success field:</span>
                          <Badge className={testResults.pdfTest.checks.hasSuccessField ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.pdfTest.checks.hasSuccessField ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has pdfBase64 on success:</span>
                          <Badge className={testResults.pdfTest.checks.hasPdfBase64OnSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.pdfTest.checks.hasPdfBase64OnSuccess ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has fileName on success:</span>
                          <Badge className={testResults.pdfTest.checks.hasFileNameOnSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.pdfTest.checks.hasFileNameOnSuccess ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#5c5f7a]">✓ Has error on failure:</span>
                          <Badge className={testResults.pdfTest.checks.hasErrorOnFailure ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {testResults.pdfTest.checks.hasErrorOnFailure ? 'PASS' : 'FAIL'}
                          </Badge>
                        </div>
                      </div>
                      <details className="mt-2">
                        <summary className="text-sm text-[#5c5f7a] cursor-pointer">View Response</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify({
                            ...testResults.pdfTest.response,
                            pdfBase64: testResults.pdfTest.response?.pdfBase64 ? '(base64 string truncated)' : undefined
                          }, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth & Permissions Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-[#414257]">Auth & Permissions</CardTitle>
              <CardDescription>Current user authentication and permission status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div>
            <h3 className="font-semibold text-[#414257] mb-3">Current User</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5c5f7a]">ID:</span>
                <span className="font-mono text-sm text-[#414257]">{user.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5c5f7a]">Name:</span>
                <span className="font-medium text-[#414257]">{user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5c5f7a]">Email:</span>
                <span className="text-sm text-[#414257]">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div>
            <h3 className="font-semibold text-[#414257] mb-3">Roles</h3>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role} className="bg-[#414257] text-white">
                  {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="font-semibold text-[#414257] mb-3">Permissions</h3>
            <div className="space-y-2">
              {user.permissions.map((permission) => (
                <div 
                  key={permission}
                  className="flex items-center justify-between p-2 bg-[#e3e4ed] rounded-lg"
                >
                  <span className="font-mono text-sm text-[#414257]">{permission}</span>
                  <Badge className="bg-green-100 text-green-800">Granted</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Manager Access Status */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#414257]">Invoice Manager Access</p>
                <p className="text-sm text-[#5c5f7a] mt-1">
                  {hasPermission('invoice-manager:access') 
                    ? 'Full access to Invoice Manager applet'
                    : 'No access to Invoice Manager applet'}
                </p>
              </div>
              <Badge className={hasPermission('invoice-manager:access') 
                ? 'bg-green-100 text-green-800 border-green-200' 
                : 'bg-red-100 text-red-800 border-red-200'
              }>
                {hasPermission('invoice-manager:access') ? 'YES' : 'NO'}
              </Badge>
            </div>
          </div>

          {/* Future Feature Permissions Note */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Future feature-level permissions (e.g., <code className="bg-amber-100 px-1 rounded">invoice-manager:read</code> vs <code className="bg-amber-100 px-1 rounded">invoice-manager:write</code>) are not yet implemented but can be added to control specific actions like edit, delete, or send.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}