import LoginForm from '../features/authByEmail/ui/LoginForm';
import styles from './PageStyles.module.css'; // Import common page styles

const LoginPage = () => {
  return (
    <div className={styles.formPageContainer}> {/* Use formPageContainer for centering */}
      <h1>Login</h1>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
