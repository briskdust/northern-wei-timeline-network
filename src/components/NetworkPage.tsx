import React, { useEffect, useRef, useState } from "react";
import { Card, Typography, Button, Space, List, Spin } from "antd";
import { ArrowLeft, Users, User, Network as NetworkIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import {
  getPersonById,
  getPersonRelationships,
  getAllPersons,
} from "../services/api";
import type { NetworkNode, NetworkEdge, Relationship, Person } from "../types/index";

const { Title, Text } = Typography;

const NetworkPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  
  // 使用state来管理数据
  const [person, setPerson] = useState<Person | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 异步加载数据
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [personData, relationshipsData, allPeopleData] = await Promise.all([
          getPersonById(id),
          getPersonRelationships(id),
          getAllPersons()
        ]);
        
        if (!personData) {
          setError("未找到该人物信息");
          return;
        }
        
        setPerson(personData);
        setRelationships(relationshipsData);
        setAllPeople(allPeopleData);
      } catch (err) {
        console.error('加载数据失败:', err);
        setError("加载数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // 创建网络图
  useEffect(() => {
    if (!person || !relationships || !allPeople || !networkRef.current) return;

    // 准备节点数据
    const nodes: NetworkNode[] = [
      {
        id: person.id,
        label: person.name,
        title: person.alias?.[0] || "",
        color: "#ff6b6b",
        group: "center",
      },
    ];

    // 添加关系人物节点
    relationships.forEach(rel => {
      const targetPersonId =
        rel.person1Id === person.id ? rel.person2Id : rel.person1Id;
      const targetPerson = allPeople.find(p => p.id === targetPersonId);

      if (targetPerson) {
        nodes.push({
          id: targetPerson.id,
          label: targetPerson.name,
          title: targetPerson.alias?.[0] || "",
          color: "#4ecdc4",
          group: "related",
        });
      }
    });

    // 准备边数据
    const edges: NetworkEdge[] = relationships.map(rel => {
      const targetPersonId =
        rel.person1Id === person.id ? rel.person2Id : rel.person1Id;
      return {
        id: rel.id,
        from: person.id,
        to: targetPersonId,
        label: rel.description,
        color: "#667eea",
        arrows: "to",
      };
    });

    // 创建数据集
    const nodesDataSet = new DataSet(nodes);
    const edgesDataSet = new DataSet(edges);

    // 网络配置
    const options = {
      nodes: {
        shape: "circle",
        size: 30,
        font: {
          size: 16,
          color: "#333",
          face: "Inter, sans-serif",
          strokeWidth: 2,
          strokeColor: "#ffffff",
        },
        borderWidth: 3,
        borderColor: "#ffffff",
        shadow: {
          enabled: true,
          color: "rgba(0,0,0,0.2)",
          size: 10,
          x: 2,
          y: 2,
        },
        chosen: true,
      },
      edges: {
        width: 3,
        color: {
          color: "#667eea",
          highlight: "#5a67d8",
        },
        font: {
          size: 14,
          color: "#4a5568",
          background: "rgba(255,255,255,0.9)",
          strokeWidth: 2,
          strokeColor: "#ffffff",
          face: "Inter, sans-serif",
        },
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.5,
        },
        shadow: {
          enabled: true,
          color: "rgba(102, 126, 234, 0.3)",
          size: 5,
          x: 1,
          y: 1,
        },
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 150 },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 120,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        selectConnectedEdges: false,
        hoverConnectedEdges: true,
      },
    };

    // 创建网络
    networkInstance.current = new Network(
      networkRef.current,
      { nodes: nodesDataSet, edges: edgesDataSet },
      options
    );

    // 节点点击事件
    networkInstance.current.on("click", params => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        if (nodeId !== person.id) {
          navigate(`/person/${nodeId}`);
        }
      }
    });

    // 清理函数
    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
    };
  }, [person, relationships, allPeople, navigate]);

  // 加载状态
  if (loading) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          margin: "80px auto",
          maxWidth: "500px",
        }}
      >
        <Spin size="large" />
        <br />
        <Text style={{ fontSize: "18px", color: "rgba(255, 255, 255, 0.8)", marginTop: "16px" }}>
          正在加载关系网络...
        </Text>
      </div>
    );
  }

  // 错误状态
  if (error || !person) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          margin: "80px auto",
          maxWidth: "500px",
        }}
      >
        <Text style={{ fontSize: "18px", color: "rgba(255, 255, 255, 0.8)" }}>
          {error || "未找到该人物信息"}
        </Text>
        <br />
        <Button
          type="primary"
          size="large"
          onClick={() => navigate("/")}
          style={{ marginTop: "24px" }}
        >
          返回搜索
        </Button>
      </div>
    );
  }

  const handlePersonClick = (targetPersonId: string) => {
    navigate(`/person/${targetPersonId}`);
  };

  // 获取关系人物列表
  const getRelatedPeople = () => {
    return relationships.map(rel => {
      const targetPersonId =
        rel.person1Id === person.id ? rel.person2Id : rel.person1Id;
      const targetPerson = allPeople.find(p => p.id === targetPersonId);
      return { relationship: rel, person: targetPerson };
    }).filter(item => item.person);
  };

  const relatedPeople = getRelatedPeople();

  return (
    <div
      style={{
        padding: "40px 3%",
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        className="fade-in-up"
        style={{ maxWidth: "100%", margin: "0 auto" }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Button
              icon={<ArrowLeft size={18} />}
              onClick={() => navigate("/")}
              style={{
                marginBottom: "24px",
                background: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(255, 255, 255, 0.3)",
                color: "white",
              }}
              size="large"
            >
              返回搜索
            </Button>

            <Card
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
                overflow: "hidden",
                marginBottom: "32px",
              }}
              bodyStyle={{ padding: "32px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                  }}
                >
                  <NetworkIcon size={36} color="white" />
                </div>
                <div>
                  <Title
                    level={2}
                    style={{
                      margin: 0,
                      background: "linear-gradient(135deg, #667eea, #764ba2)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {person.name} 的关系网络
                  </Title>
                  <Text style={{ fontSize: "16px", color: "#666" }}>
                    探索历史人物之间的复杂关系
                  </Text>
                </div>
              </div>
            </Card>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "32px",
              alignItems: "start",
            }}
          >
            {/* 关系网络图 */}
            <Card
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
                overflow: "hidden",
                minHeight: "600px",
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                ref={networkRef}
                style={{
                  width: "100%",
                  height: "600px",
                  background: "#f8fafc",
                }}
              />
            </Card>

            {/* 关系列表 */}
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={20} style={{ color: "#667eea" }} />
                  <span>相关人物</span>
                </div>
              }
              style={{
                background:
                  "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
                overflow: "hidden",
              }}
              bodyStyle={{ padding: "16px" }}
            >
              {relatedPeople.length > 0 ? (
                <List
                  dataSource={relatedPeople}
                  renderItem={({ relationship, person }) => (
                    <List.Item
                      style={{
                        cursor: "pointer",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        transition: "all 0.3s ease",
                        background: "rgba(255, 255, 255, 0.5)",
                      }}
                      onClick={() => handlePersonClick(person!.id)}
                      className="bounce-hover"
                    >
                      <div style={{ width: "100%" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #4ecdc4, #44a08d)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <User size={20} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#2c3e50",
                                fontSize: "16px",
                              }}
                            >
                              {person!.name}
                            </div>
                            <div style={{ color: "#667eea", fontSize: "14px" }}>
                              {relationship.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <Users size={48} style={{ color: "#ccc", marginBottom: "16px" }} />
                  <Text style={{ color: "#999" }}>暂无关系数据</Text>
                </div>
              )}
            </Card>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default NetworkPage;
