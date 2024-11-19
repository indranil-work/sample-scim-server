/** Copyright © 2016-2018, Okta, Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

let LdapClient = require('ldapjs-client');
let client = new LdapClient({ url: 'ldap://18.119.28.248:389' });
let uuid = require('uuid');
let scimCore = require('./SCIMCore');
let out = require('./Logs');
let mUser = require('../models/User');
let mGroup = require('../models/Group');
let mGroupMembership = require('../models/GroupMembership');

class Database {
    static async dbInit() {
        try {
            out.log("INFO", "ServerStartup", "Bind start");
            await client.bind('cn=admin,dc=oktademo,dc=com', 'Scim@magic4');
            out.log("INFO", "ServerStartup", "Bind suucess");
          } catch (e) {
            out.log("ERROR", "ServerStartup", "Bind failed");
            console.log(e);
          }
          
    }

    static async getFilteredUsers(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
        let customFilter = '(&(objectclass=inetOrgPerson)' + '('+ filterAttribute + '=' + filterValue + '))';
        let rows = null;
        let self = this;
        try {
            const options = {
              filter: customFilter,
              scope: 'sub',
              attributes: ['sn', 'cn', 'uid', 'mail', 'dn', 'givenName']
            };
          
            const entries = await client.search('ou=Users,dc=oktademo,dc=com', options);

            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    userName: entry.uid,
                    email: entry.mail,
                    givenName: entry.givenName,
                    familyName: entry.sn,
                    active: "true"
                }; 
            });

            if (rows.length < count) {
                count = rows.length;
            }

            for (let i = 0; i < rows.length; i++) {
                rows[i]["groups"] = await self.getGroupsForUser(rows[i]["userName"]);
            }

            console.log(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));

            callback(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getFilteredUsers", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    static async getFilteredGroups(filterAttribute, filterValue, startIndex, count, reqUrl, callback) {
        let customFilter = '(&(objectclass=posixGroup)' + '('+ filterAttribute + '=' + filterValue + '))';
        
        let rows = null;
        let self = this;
        try {
            const options = {
              filter: customFilter,
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };
          
            const entries = await client.search('ou=Groups,dc=oktademo,dc=com', options);

            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    displayName: entry.cn,
                    members: entry.memberUid
                }; 
            });

            if (rows.length < count) {
                count = rows.length;
            }

            console.log(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));

            callback(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getFilteredGroups", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    static async getAllUsers(startIndex = 1, count = 10, reqUrl, callback) {
        let rows = null;
        let self = this;
        try {
            const options = {
              filter: '(objectclass=inetOrgPerson)',
              scope: 'sub',
              attributes: ['sn', 'cn', 'uid', 'mail', 'dn', 'givenName']
            };
          
            const entries = await client.search('ou=Users,dc=oktademo,dc=com', options);

            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    userName: entry.uid,
                    email: entry.mail,
                    givenName: entry.givenName,
                    familyName: entry.sn,
                    active: "true"
                }; 
            });

            if (rows.length < count) {
                count = rows.length;
            }

            for (let i = 0; i < rows.length; i++) {
                rows[i]["groups"] = await self.getGroupsForUser(rows[i]["userName"]);
            }

            console.log(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));

            callback(scimCore.createSCIMUserList(rows, startIndex, count, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getAllUsers", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }


    static async getAllGroups(startIndex = 1, count = 10, reqUrl, callback) {
        let rows = null;
        let self = this;
        try {
            const options = {
              filter: '(objectclass=posixGroup)',
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };
          
            const entries = await client.search('ou=Groups,dc=oktademo,dc=com', options);


            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    displayName: entry.cn,
                    members: entry.memberUid
                }; 
            });

            if (rows.length < count) {
                count = rows.length;
            }

            console.log(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));

            callback(scimCore.createSCIMGroupList(rows, startIndex, count, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getAllGroups", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    static async getUser(userId, reqUrl, callback) {
        let rows = null;
        let self = this;
        try {
            const options = {
              filter: '(objectClass=*)',
              scope: 'sub',
              attributes: ['sn', 'cn', 'uid', 'mail', 'dn', 'givenName']
            };
          
            const entries = await client.search(userId, options);

            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    userName: entry.uid,
                    email: entry.mail,
                    givenName: entry.givenName,
                    familyName: entry.sn,
                    active: "true"
                }; 
            });

            const user = rows[0];
            user["groups"] = await self.getGroupsForUser(user["userName"]);

            console.log(user);
            console.log(scimCore.parseSCIMUser(user, reqUrl));

            callback(scimCore.parseSCIMUser(user, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getUser", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    static async getGroup(groupId, reqUrl, callback) {

        let rows = null;
        let self = this;
        try {
            const options = {
              filter: '(objectClass=*)',
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };

            console.log(groupId);
          
            const entries = await client.search(groupId, options);

            console.log(entries);


            rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    displayName: entry.cn,
                    members: entry.memberUid
                }; 
            });

            const group = rows[0];

            console.log(scimCore.parseSCIMGroup(group, reqUrl));

            callback(scimCore.parseSCIMGroup(group, reqUrl));
          } catch (e) {
            console.log(e);
            out.error("Ldap.getGroup", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
        
    }

    static async createUser(userModel, reqUrl, callback) {
        console.log(userModel);
        try {
            const user = {
                            objectclass: 'inetOrgPerson', 
                            uid: userModel.userName, 
                            mail: userModel.email,
                            cn: userModel.givenName + ' ' + userModel.familyName, 
                            givenName: userModel.givenName,
                            sn: userModel.familyName
                        };   
                        
            console.log(user);
            const dn = 'cn=' + user.cn + ',ou=Users,dc=oktademo,dc=com';
            await client.add(dn, user);
            let groups = userModel["groups"] || [];
 
            for (let i = 0; i < groups.length; i++) {

                let options = {
                    filter: '(objectClass=*)',
                    scope: 'sub',
                    attributes: ['cn', 'dn', 'memberUid']
                  };
                
                const entries = await client.search('dn=' + groups[i].id + ',ou=Groups,dc=oktademo,dc=com', options);
                const group = entries[0];

                let membership = group["memberUid"];
                
                if (membership.indexOf(userModel.userName) === -1) {
                    membership.push(userModel.userName);
                }
                
                
                let change = {
                    operation: 'replace', // add, delete, replace
                    modification: {
                        memberUid: membership
                    }
                  };
                
                  await client.modify(groups[i].id, change);
            }

            
            console.log(scimCore.createSCIMUser(dn, true, userModel["userName"], userModel["givenName"], 
                userModel["familyName"], userModel["email"],groups, reqUrl));
            callback(scimCore.createSCIMUser(dn, true, userModel["userName"], userModel["givenName"], 
                userModel["familyName"], userModel["email"],groups, reqUrl));

          } catch (e) {
            console.log(e);
            out.error("Ldap.createUser", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    static async createGroup(groupModel, reqUrl, callback) {
        try {
            console.log(groupModel);
            const memberships = groupModel["members"];
            let memberUidList = [];
            for (let i = 0; i < memberships.length; i++) {
                const userDn = memberships[i].value;
                const options = {
                  filter: '(objectClass=*)',
                  scope: 'sub',
                  attributes: ['cn', 'uid', 'mail', 'dn']
                };
              
                const entries = await client.search(userDn, options);
                const user = entries[0];
                memberUidList.push(user.uid);
            }
            
            const group = {
                            objectclass: ['posixGroup'], 
                            cn: groupModel["displayName"],
                            gidNumber: 2000, 
                            memberUid: memberUidList
                        };   
            console.log(group);       
            const dn = 'cn=' + group.cn + ',ou=Groups,dc=oktademo,dc=com';
            await client.add(dn, group);
            console.log(scimCore.createSCIMGroup(dn, groupModel["displayName"], groupModel["members"], reqUrl));
            callback(scimCore.createSCIMGroup(dn, groupModel["displayName"], groupModel["members"], reqUrl));
           
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.createGroup", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
    }

    

    static async deleteUser(userId, reqUrl, callback) {
        try {
            await client.del(userId);
            console.log("Delete successful");
            callback(scimCore.createSCIMUser(userId, false, null, null, 
              null, null, null, reqUrl));            
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.deleteUser::DELETE", err);
            callback(scimCore.createSCIMError(err, "400"));
          }
    }

    static async deleteGroup(groupId, reqUrl, callback) {
        try {
            await client.del(groupId);
            console.log("Delete successful"); 
            
            callback(scimCore.createSCIMGroup(groupId, null, null, reqUrl));
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.deleteGroup::DELETE", err);
            callback(scimCore.createSCIMError(err, "400"));
          }
    }

    static async patchUser(attributeName, attributeValue, userId, reqUrl, callback) {
        console.log("PATCH");
        console.log(attributeName);
        console.log(attributeValue);
        console.log(userId);
        console.log(reqUrl);

        if ((attributeName === "active") && (attributeValue === false)){
          console.log("Delete the user");
          try {
            await client.del(userId);
            console.log("Delete successful");
            callback(scimCore.createSCIMUser(userId, false, null, null, 
              null, null, null, reqUrl));           
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.deleteUser::DELETE", err);
            callback(scimCore.createSCIMError(err, "400"));
          }
        }
        
    }

    static async patchGroup(attributeName, attributeValue, groupId, reqUrl, callback) {
        console.log("PATCH");
        console.log(attributeName);
        console.log(attributeValue);
        console.log(groupId);
        console.log(reqUrl);

        if (attributeName === "members"){
          try {
            let memberUidList = [];
            
            const options = {
              filter: '(objectClass=*)',
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };          
            
            const entries = await client.search(groupId, options);
            const group = entries[0];

            if (Array.isArray(group.memberUid))
                memberUidList = [...group.memberUid];
            else
                memberUidList = [group.memberUid];

            for (let i = 0; i < attributeValue.length; i++) {
                const userDn = attributeValue[i].value;
                const options = {
                  filter: '(objectClass=*)',
                  scope: 'sub',
                  attributes: ['cn', 'uid', 'mail', 'dn']
                };
              
                const entries = await client.search(userDn, options);
                const user = entries[0];
                if (memberUidList.indexOf(user.uid) == -1){
                  memberUidList.push(user.uid);
                }     
                    
            }
            
            let change = {
              operation: 'replace', // add, delete, replace
              modification: {
                  memberUid: memberUidList
              }
            };

            console.log(memberUidList);
          
            await client.modify(groupId, change); 
            
            callback(scimCore.createSCIMGroup(groupId, null, null, reqUrl));
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.patchGroup", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
        }  else if (attributeName === "remove_member"){
          try {
            let memberUidList = [];
            
            const options = {
              filter: '(objectClass=*)',
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };          
            
            const entries = await client.search(groupId, options);
            const group = entries[0];

            if (Array.isArray(group.memberUid))
              memberUidList = [...group.memberUid];
            else
              memberUidList = [group.memberUid];

            const memberOptions = {
              filter: '(objectClass=*)',
              scope: 'sub',
              attributes: ['cn', 'uid', 'mail', 'dn']
            };
          
            const memberEntries = await client.search(attributeValue, memberOptions);
            const user = memberEntries[0];
            console.log("To remove: " +  user.uid);

            const index = memberUidList.indexOf(user.uid);
            if (index > -1) { 
              memberUidList.splice(index, 1);
              let change = {
                operation: 'replace', // add, delete, replace
                modification: {
                    memberUid: memberUidList
                }
              };
              console.log(memberUidList);
              await client.modify(groupId, change);  
            }
            
            callback(scimCore.createSCIMGroup(groupId, null, null, reqUrl));
            
          } catch (e) {
            console.log(e);
            out.error("Ldap.patchGroup", e);
            callback(scimCore.createSCIMError(e, "400"));
          }
        } else{
          callback(scimCore.createSCIMGroup(groupId, null, null, reqUrl));
        }  
    }

    static async updateUser(userModel, userId, reqUrl, callback) {

        console.log("PUT");
        console.log(userModel);
        
    }

    static async updateGroup(groupModel, groupId, reqUrl, callback) {

        console.log("PUT");
        console.log(groupModel);
        
    }


    static async getGroupsForUser(userId) {
        try {
            const options = {
              filter: '(memberUid=' + userId + ')',
              scope: 'sub',
              attributes: ['cn', 'dn', 'memberUid']
            };
          
            const entries = await client.search('ou=Groups,dc=oktademo,dc=com', options);

            const rows = entries.map(entry => { 
                return { 
                    id: entry.dn, 
                    displayName: entry.cn,
                }; 
            });

            return rows;

          } catch (e) {
            console.log(e);
            out.error("Ldap.getGroupsForUser", e);
            throw e;
          }
    }
}

module.exports = Database;