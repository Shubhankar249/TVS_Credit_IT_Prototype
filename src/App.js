import './App.css';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { KYC } from './components/KYC';
import { Home } from './components/Home';
import PI from './components/PI';

import { withRouter } from 'react-router';
function App() {
  return (
    <Router>
      <Switch>
        <Route path='/' exact component={Home}/>
        <Route path='/kyc' component={KYC}/>
        <Route exact path='/pi' component={props => <PI {...props} isAgent={false} />}/>
        <Route path='/pi/agent' component={props => <PI {...props} isAgent={true} />}/>
      </Switch>
    </Router>
  );
}

export default App;
