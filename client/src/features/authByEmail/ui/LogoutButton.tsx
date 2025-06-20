import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/auth/AuthContext'; // Adjusted path

const LogoutButton = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to the landing page after logout
  };

  if (!isAuthenticated) {
    return null; // Don't show logout button if not authenticated
  }

  return (
    <button onClick={handleLogout} className="secondary"> {/* Assuming a 'secondary' class for styling */}
      Logout
    </button>
  );
};

export default LogoutButton;
