import React, { Component } from "react";
import Company from "../popups/Company";
import { getCompanies } from "../../actions/companyActions";
import { connect } from "react-redux";
import PropTypes from "prop-types";

class SideNav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      list: [],
      open: null,
      popupState: false,
      loaded: false
    };

    this.addCompany = this.addCompany.bind(this);

    if (!this.state.loaded) {
      this.props.getCompanies();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.company.company.companies) {
      this.setState({
        list: nextProps.company.company.companies,
        loaded: true
      });
    }
  }

  addCompany = () => {
    this.setState({ popupState: !this.state.popupState });
  };

  renderCompanyList = () => {
    return (
      <ul className="List">
        {this.state.list.map((company, i) => {
          return (
            <li key={i}>
              {company.name}
              {this.renderDashboardList(company)}
            </li>
          );
        })}
      </ul>
    );
  };

  renderDashboardList = company => {
    let elements;
    if (company["dashboards"].length <= 0) {
      elements = <li>No dashboards</li>;
    } else {
      elements = company["dashboards"].map((dashboard, i) => {
        return <li key={i}>{dashboard.name}</li>;
      });
    }

    return <ul className="subList">{elements}</ul>;
  };

  render() {
    const { companies } = this.props.company;
    let popupState;
    if (this.state.popupState) {
      popupState = <Company />;
    }
    return (
      <div>
        {/* Top buttons */}
        <button className="btn icon" onClick={this.addCompany}>
          <i className="material-icons">add</i>
          <span>Add company</span>
        </button>
        <button className="btn icon">
          <i className="material-icons">add</i>
          <span>Add dashboard</span>
        </button>

        {/* List */}
        {this.renderCompanyList()}

        {popupState}
      </div>
    );
  }
}
SideNav.propTypes = {
  getCompanies: PropTypes.func.isRequired
};
const mapStateToProps = state => ({
  company: state.company
});
export default connect(
  mapStateToProps,
  { getCompanies }
)(SideNav);
