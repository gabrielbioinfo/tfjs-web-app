import React from 'react';
import { Route, Switch } from 'react-router-dom';
import About from './pages/About';
import Classify from './pages/Classify';
import NewClassify from './pages/NewClassify';
import NotFound from './pages/NotFound';

export default ({ childProps }) =>
  <Switch>
    <Route path="/" exact component={NewClassify} props={childProps} />
    <Route path="/oldclassifier" exact component={Classify} props={childProps} />
    <Route path="/about" exact component={About} props={childProps} />
    <Route component={NotFound} />
  </Switch>;
