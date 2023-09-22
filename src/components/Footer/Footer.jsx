function Footer() {
    const currentYear = new Date().getFullYear();
  
    return (
      <footer style={{ textAlign: 'center', padding: '1em', backgroundColor: '#f0f0f0' }}>
        <p>&copy; {currentYear} whitedevil. All rights reserved.</p>
      </footer>
    );
  }
export default Footer;  