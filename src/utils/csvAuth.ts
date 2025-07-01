interface UserRecord {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
}

class CSVAuthManager {
  private readonly STORAGE_KEY = 'interview_app_users_csv';
  
  private parseCSV(csvContent: string): UserRecord[] {
    if (!csvContent.trim()) return [];
    
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return []; // No data rows
    
    const headers = lines[0].split(',');
    const users: UserRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        users.push({
          id: values[0],
          email: values[1],
          name: values[2],
          password: values[3],
          createdAt: values[4]
        });
      }
    }
    
    return users;
  }
  
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  private generateCSV(users: UserRecord[]): string {
    const headers = 'id,email,name,password,createdAt';
    const rows = users.map(user => 
      `"${user.id}","${user.email}","${user.name}","${user.password}","${user.createdAt}"`
    );
    return [headers, ...rows].join('\n');
  }
  
  private loadUsers(): UserRecord[] {
    try {
      const csvContent = localStorage.getItem(this.STORAGE_KEY) || '';
      return this.parseCSV(csvContent);
    } catch (error) {
      console.error('Error loading users from CSV:', error);
      return [];
    }
  }
  
  private saveUsers(users: UserRecord[]): void {
    try {
      const csvContent = this.generateCSV(users);
      localStorage.setItem(this.STORAGE_KEY, csvContent);
      console.log('Users saved successfully:', users.length);
    } catch (error) {
      console.error('Error saving users to CSV:', error);
      throw new Error('Failed to save user data');
    }
  }
  
  private hashPassword(password: string): string {
    // Simple hash function for demo purposes
    // In production, use proper password hashing like bcrypt
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  async register(email: string, password: string, name: string): Promise<UserRecord | null> {
    try {
      console.log('Attempting to register user:', email);
      const users = this.loadUsers();
      console.log('Current users:', users.length);
      
      // Check if user already exists
      const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        console.log('User already exists:', email);
        return null; // User already exists
      }
      
      // Create new user
      const newUser: UserRecord = {
        id: Date.now().toString(),
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password: this.hashPassword(password),
        createdAt: new Date().toISOString()
      };
      
      console.log('Creating new user:', newUser);
      users.push(newUser);
      this.saveUsers(users);
      
      console.log('User registered successfully:', newUser.email);
      return newUser;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }
  
  async login(email: string, password: string): Promise<UserRecord | null> {
    try {
      console.log('Attempting to login user:', email);
      const users = this.loadUsers();
      console.log('Total users in database:', users.length);
      
      const hashedPassword = this.hashPassword(password);
      console.log('Looking for user with email:', email.toLowerCase());
      
      const user = users.find(u => {
        const emailMatch = u.email.toLowerCase() === email.toLowerCase().trim();
        const passwordMatch = u.password === hashedPassword;
        console.log(`Checking user ${u.email}: email match=${emailMatch}, password match=${passwordMatch}`);
        return emailMatch && passwordMatch;
      });
      
      if (user) {
        console.log('Login successful for:', user.email);
        return user;
      } else {
        console.log('Login failed - no matching user found');
        return null;
      }
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }
  
  async getAllUsers(): Promise<UserRecord[]> {
    return this.loadUsers();
  }
  
  async exportCSV(): Promise<string> {
    const users = this.loadUsers();
    return this.generateCSV(users);
  }
  
  async importCSV(csvContent: string): Promise<boolean> {
    try {
      const users = this.parseCSV(csvContent);
      this.saveUsers(users);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
  
  // Debug method to check storage
  async debugStorage(): Promise<void> {
    const csvContent = localStorage.getItem(this.STORAGE_KEY);
    console.log('Raw CSV content:', csvContent);
    const users = this.loadUsers();
    console.log('Parsed users:', users);
  }
}

export const csvAuthManager = new CSVAuthManager();