import RegistrationForm from '../features/authByEmail/ui/RegistrationForm';
import styles from './PageStyles.module.css'; // Import common page styles

const RegistrationPage = () => {
  return (
    <div className={styles.formPageContainer}> {/* Use formPageContainer for centering */}
      <h1>User Registration</h1>
      <RegistrationForm />
    </div>
  );
};

export default RegistrationPage;
