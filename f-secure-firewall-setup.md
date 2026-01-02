# F-Secure Security Suite - Firewall Configuration Guide

## 🔥 Allow HR Candidate Evaluation App Through F-Secure Firewall

### **Method 1: Allow Applications (Recommended)**

#### **Step 1: Open F-Secure**
1. **Right-click** F-Secure icon in system tray (bottom-right corner)
2. **Click "Open F-Secure"** or double-click the icon

#### **Step 2: Navigate to Firewall Settings**
1. Click **"Settings"** (gear icon)
2. Click **"Firewall"** in the left sidebar
3. Click **"Application control"** or **"Allowed applications"**

#### **Step 3: Add Node.js Applications**
1. Click **"Add application"** or **"+"** button
2. **Browse to Node.js executable**:
   - Default path: `C:\Program Files\nodejs\node.exe`
   - Or search for `node.exe` in your system
3. **Select node.exe** and click **"Add"** or **"Allow"**
4. **Set permissions**:
   - ✅ **Allow incoming connections**
   - ✅ **Allow outgoing connections**
   - ✅ **Allow on all networks** (or specify your local network)

#### **Step 4: Add NPM (if needed)**
1. Repeat the process for **npm.exe**:
   - Path: `C:\Program Files\nodejs\npm.exe`
   - Or: `C:\Users\[YourUsername]\AppData\Roaming\npm\npm.exe`
2. **Allow all connections** for npm as well

### **Method 2: Allow Specific Ports**

#### **Step 1: Open Port Configuration**
1. In F-Secure **Firewall settings**
2. Click **"Port control"** or **"Network rules"**
3. Click **"Add rule"** or **"+"**

#### **Step 2: Create Rules for Your Ports**

**Rule 1 - Frontend (Port 8080):**
- **Name**: HR Eval Frontend
- **Protocol**: TCP
- **Port**: 8080
- **Direction**: Inbound
- **Action**: Allow
- **Network**: Local network or All networks

**Rule 2 - Backend (Port 3001):**
- **Name**: HR Eval Backend
- **Protocol**: TCP  
- **Port**: 3001
- **Direction**: Inbound
- **Action**: Allow
- **Network**: Local network or All networks

### **Method 3: Temporary Disable (For Testing)**

#### **Quick Test Method:**
1. **Right-click** F-Secure in system tray
2. **Click "Disable firewall"**
3. **Select "10 minutes"** or **"Until restart"**
4. **Test network access** from another machine
5. **Re-enable firewall** after testing
6. If it works, use Method 1 or 2 for permanent solution

### **Method 4: Network Profile Settings**

#### **Step 1: Check Network Profile**
1. In F-Secure **Firewall settings**
2. Click **"Network profiles"** or **"Network settings"**
3. Find your current network (Wi-Fi name)

#### **Step 2: Adjust Network Trust Level**
1. **Select your network**
2. **Change profile** to:
   - **"Home network"** (most permissive)
   - **"Work network"** (moderate)
   - Avoid **"Public network"** (most restrictive)

## 🔍 **Troubleshooting F-Secure Issues**

### **If Applications Don't Appear:**
1. **Start your servers first** (npm run dev)
2. **Then add to F-Secure** while they're running
3. F-Secure can **detect active applications** easier

### **If Ports Don't Work:**
1. **Check port numbers** are exactly: 8080 and 3001
2. **Verify protocol** is set to TCP (not UDP)
3. **Ensure direction** is set to "Inbound" or "Both"

### **Alternative: F-Secure Learning Mode**
1. **Enable "Learning mode"** in F-Secure firewall
2. **Access your application** from another machine
3. **F-Secure will ask** to allow the connection
4. **Click "Allow"** and **"Remember this decision"**

## 📋 **Verification Steps**

### **After Configuration:**
1. **Restart your applications**:
   ```powershell
   # Stop servers (Ctrl+C)
   # Then restart:
   cd server && npm run dev    # Terminal 1
   npm run dev                 # Terminal 2
   ```

2. **Test network access**:
   ```powershell
   .\verify-network-access-fixed.ps1
   ```

3. **From another machine**, try:
   - `http://192.168.32.1:8080` (Frontend)
   - `http://192.168.32.1:3001/api/health` (Backend)

## 🎯 **Expected Results**

### **Success Indicators:**
- ✅ **No firewall popup** when starting servers
- ✅ **Network access works** from other machines  
- ✅ **F-Secure shows** applications as "Allowed"
- ✅ **Port rules show** as "Active" or "Enabled"

### **If Still Not Working:**
1. **Check Windows Firewall** (might need rules there too)
2. **Verify router settings** (AP isolation disabled)
3. **Test with firewall completely disabled** temporarily
4. **Check antivirus real-time protection** settings

## 💡 **Pro Tips**

- **Method 1 (Applications)** is usually more reliable than port rules
- **Always test** with firewall temporarily disabled first
- **F-Secure updates** can reset custom rules - may need to reconfigure
- **Document your settings** for future reference

---

**Need help?** Run the verification script after making changes to see if the configuration worked!